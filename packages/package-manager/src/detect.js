import { existsSync } from "node:fs";
import { join } from "node:path";
const LOCKFILES = {
    "bun.lock": "bun",
    "bun.lockb": "bun",
    "package-lock.json": "npm",
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
};
export async function detect(cwd) {
    const dir = cwd ?? process.cwd();
    // 1. Check lockfiles
    for (const [lockfile, manager] of Object.entries(LOCKFILES)) {
        if (existsSync(join(dir, lockfile))) {
            return manager;
        }
    }
    // 2. Check packageManager field in package.json
    try {
        const pkgFile = Bun.file(join(dir, "package.json"));
        const pkg = await pkgFile.json();
        if (pkg.packageManager) {
            const name = pkg.packageManager.split("@")[0];
            if (name === "bun" || name === "npm" || name === "yarn" || name === "pnpm") {
                return name;
            }
        }
    }
    catch {
        // package.json doesn't exist or is invalid
    }
    // 3. Default to bun
    return "bun";
}
//# sourceMappingURL=detect.js.map