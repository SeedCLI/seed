import { Runtime } from "./runtime.js";
// ─── Builder ───
export class Builder {
    cfg;
    constructor(brand) {
        this.cfg = {
            brand,
            commands: [],
            middleware: [],
            extensions: [],
            plugins: [],
            pluginDirs: [],
            helpEnabled: false,
            versionEnabled: false,
            completionsEnabled: false,
        };
    }
    command(cmd) {
        this.cfg.commands.push(cmd);
        return this;
    }
    commands(cmds) {
        this.cfg.commands.push(...cmds);
        return this;
    }
    defaultCommand(cmd) {
        this.cfg.defaultCommand = cmd;
        return this;
    }
    middleware(fn) {
        this.cfg.middleware.push(fn);
        return this;
    }
    extension(ext) {
        this.cfg.extensions.push(ext);
        return this;
    }
    plugin(source) {
        if (Array.isArray(source)) {
            this.cfg.plugins.push(...source);
        }
        else {
            this.cfg.plugins.push(source);
        }
        return this;
    }
    plugins(dir, options) {
        this.cfg.pluginDirs.push({ dir, options });
        return this;
    }
    src(dir) {
        this.cfg.srcDir = dir;
        return this;
    }
    exclude(modules) {
        this.cfg.excludeModules = modules;
        return this;
    }
    config(options) {
        this.cfg.configOptions = options;
        return this;
    }
    help(options) {
        this.cfg.helpEnabled = true;
        this.cfg.helpOptions = options;
        return this;
    }
    version(version) {
        this.cfg.versionEnabled = true;
        if (version) {
            this.cfg.version = version;
        }
        return this;
    }
    completions() {
        this.cfg.completionsEnabled = true;
        return this;
    }
    onReady(fn) {
        this.cfg.onReady = fn;
        return this;
    }
    onError(fn) {
        this.cfg.onError = fn;
        return this;
    }
    create() {
        return new Runtime(this.cfg);
    }
}
// ─── Public API ───
/**
 * Create a new CLI builder.
 *
 * ```ts
 * const cli = build("mycli")
 *   .command(helloCommand)
 *   .help()
 *   .version("1.0.0")
 *   .create();
 *
 * await cli.run();
 * ```
 */
export function build(brand) {
    return new Builder(brand);
}
//# sourceMappingURL=builder.js.map