import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
export class DiscoveryError extends Error {
    filePath;
    constructor(message, filePath) {
        super(message);
        this.name = "DiscoveryError";
        this.filePath = filePath;
    }
}
async function isDir(path) {
    try {
        const s = await stat(path);
        return s.isDirectory();
    }
    catch {
        return false;
    }
}
async function importModule(filePath) {
    try {
        const mod = await import(filePath);
        return mod.default ?? mod;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new DiscoveryError(`Failed to import "${filePath}": ${message}`, filePath);
    }
}
function shouldSkip(filename) {
    return filename.startsWith("_") || filename.startsWith(".");
}
function assignName(obj, name) {
    if (!obj.name)
        obj.name = name;
}
/**
 * Discover commands from a directory.
 * Files become commands, nested directories become subcommands.
 * An `index.ts` in a subdirectory provides the parent command config.
 */
export async function discoverCommands(baseDir) {
    const commandsDir = join(baseDir, "commands");
    if (!(await isDir(commandsDir)))
        return [];
    const glob = new Bun.Glob("**/*.ts");
    const files = [];
    for await (const match of glob.scan({ cwd: commandsDir, onlyFiles: true })) {
        const parts = match.split("/");
        if (parts.some(shouldSkip))
            continue;
        files.push(match);
    }
    files.sort();
    // Group files by their directory path
    const tree = new Map();
    for (const file of files) {
        const fullPath = join(commandsDir, file);
        const mod = await importModule(fullPath);
        const cmd = mod;
        const record = cmd;
        const segments = file.replace(/\.ts$/, "").split("/");
        if (segments.length === 1) {
            // Top-level command
            const name = segments[0];
            if (name === "index")
                continue; // Skip root index
            assignName(record, name);
            tree.set(name, cmd);
        }
        else {
            // Nested: first segment is parent dir, rest form the path
            const parentName = segments[0];
            const childName = segments[segments.length - 1];
            const isIndex = childName === "index";
            if (isIndex) {
                // index.ts defines the parent command
                assignName(record, parentName);
                const existing = tree.get(parentName);
                if (existing) {
                    // Merge: keep existing subcommands
                    const subs = existing.subcommands ?? [];
                    Object.assign(cmd, { subcommands: [...(cmd.subcommands ?? []), ...subs] });
                }
                tree.set(parentName, cmd);
            }
            else {
                // Regular file becomes a subcommand
                assignName(record, childName);
                let parent = tree.get(parentName);
                if (!parent) {
                    // Auto-create minimal parent
                    parent = { name: parentName };
                    tree.set(parentName, parent);
                }
                const subs = (parent.subcommands ?? []);
                subs.push(cmd);
                parent.subcommands = subs;
            }
        }
    }
    return Array.from(tree.values());
}
/**
 * Discover extensions from a directory.
 * Each `.ts` file is imported and expected to export an ExtensionConfig.
 */
export async function discoverExtensions(baseDir) {
    const extensionsDir = join(baseDir, "extensions");
    if (!(await isDir(extensionsDir)))
        return [];
    const glob = new Bun.Glob("*.ts");
    const extensions = [];
    for await (const match of glob.scan({ cwd: extensionsDir, onlyFiles: true })) {
        if (shouldSkip(match))
            continue;
        const fullPath = join(extensionsDir, match);
        const mod = await importModule(fullPath);
        const ext = mod;
        const name = basename(match, ".ts");
        assignName(ext, name);
        extensions.push(ext);
    }
    return extensions;
}
/**
 * Discover both commands and extensions from a source directory.
 */
export async function discover(srcDir) {
    const [commands, extensions] = await Promise.all([
        discoverCommands(srcDir),
        discoverExtensions(srcDir),
    ]);
    return { commands, extensions };
}
//# sourceMappingURL=auto-discover.js.map