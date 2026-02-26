import type { Command } from "../types/command.js";
import type { BuilderConfig } from "./builder.js";
/**
 * Quick-start config for the `run()` convenience function.
 */
export interface RunConfig {
    name: string;
    version?: string;
    commands: Command[];
    defaultCommand?: Command;
}
/**
 * Quick-start function for simple CLIs without the builder pattern.
 *
 * ```ts
 * import { run } from "@seedcli/core";
 *
 * await run({
 *   name: "mycli",
 *   version: "1.0.0",
 *   commands: [hello, deploy],
 * });
 * ```
 */
export declare function run(config: RunConfig): Promise<void>;
/**
 * The CLI runtime — executes the full lifecycle:
 * 1. Load and validate plugins
 * 2. Parse argv
 * 3. Route to command
 * 4. Run extensions setup (topological order)
 * 5. Execute middleware chain
 * 6. Run command handler
 * 7. Run extensions teardown (reverse order)
 */
export declare class Runtime {
    private config;
    private registry;
    private initialized;
    constructor(config: BuilderConfig);
    run(argv?: string[]): Promise<void>;
    private initPlugins;
    private scanPluginDir;
    private executeCommand;
    private runExtensionSetup;
    private runMiddleware;
    private assembleToolbox;
    private extractCompletionInfo;
    private createCompletionsCommand;
    private printGlobalHelp;
    private handleError;
}
//# sourceMappingURL=runtime.d.ts.map