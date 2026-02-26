import type { HelpOptions } from "../command/help.js";
import type { Command, Middleware } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
import type { PluginConfig } from "../types/plugin.js";
import { Runtime } from "./runtime.js";
export interface PluginScanOptions {
    matching?: string;
}
export interface ConfigOptions {
    configName?: string;
    defaults?: Record<string, unknown>;
    cwd?: string;
}
export interface BuilderConfig {
    brand: string;
    version?: string;
    commands: Command[];
    defaultCommand?: Command;
    middleware: Middleware[];
    extensions: ExtensionConfig[];
    plugins: Array<string | PluginConfig>;
    pluginDirs: Array<{
        dir: string;
        options?: PluginScanOptions;
    }>;
    srcDir?: string;
    excludeModules?: string[];
    configOptions?: ConfigOptions;
    helpOptions?: HelpOptions;
    helpEnabled: boolean;
    versionEnabled: boolean;
    completionsEnabled: boolean;
    onReady?: (toolbox: unknown) => Promise<void> | void;
    onError?: (error: Error, toolbox: unknown) => Promise<void> | void;
}
export declare class Builder {
    private cfg;
    constructor(brand: string);
    command(cmd: Command): this;
    commands(cmds: Command[]): this;
    defaultCommand(cmd: Command): this;
    middleware(fn: Middleware): this;
    extension(ext: ExtensionConfig): this;
    plugin(source: string | string[] | PluginConfig): this;
    plugins(dir: string, options?: PluginScanOptions): this;
    src(dir: string): this;
    exclude(modules: string[]): this;
    config(options?: ConfigOptions): this;
    help(options?: HelpOptions): this;
    version(version?: string): this;
    completions(): this;
    onReady(fn: (toolbox: unknown) => Promise<void> | void): this;
    onError(fn: (error: Error, toolbox: unknown) => Promise<void> | void): this;
    create(): Runtime;
}
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
export declare function build(brand: string): Builder;
//# sourceMappingURL=builder.d.ts.map