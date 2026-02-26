import type { Command } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
export interface AutoDiscoveryResult {
    commands: Command[];
    extensions: ExtensionConfig[];
}
export declare class DiscoveryError extends Error {
    readonly filePath: string;
    constructor(message: string, filePath: string);
}
/**
 * Discover commands from a directory.
 * Files become commands, nested directories become subcommands.
 * An `index.ts` in a subdirectory provides the parent command config.
 */
export declare function discoverCommands(baseDir: string): Promise<Command[]>;
/**
 * Discover extensions from a directory.
 * Each `.ts` file is imported and expected to export an ExtensionConfig.
 */
export declare function discoverExtensions(baseDir: string): Promise<ExtensionConfig[]>;
/**
 * Discover both commands and extensions from a source directory.
 */
export declare function discover(srcDir: string): Promise<AutoDiscoveryResult>;
//# sourceMappingURL=auto-discover.d.ts.map