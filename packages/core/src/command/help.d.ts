import type { Command } from "../types/command.js";
export interface HelpOptions {
    /** Custom header text */
    header?: string;
    /** Show command aliases (default: true) */
    showAliases?: boolean;
    /** Show hidden commands (default: false) */
    showHidden?: boolean;
    /** Alphabetical sort (default: true) */
    sortCommands?: boolean;
    /** CLI brand name */
    brand?: string;
    /** CLI version */
    version?: string;
}
/**
 * Generate help text for the entire CLI (global help).
 *
 * Output format:
 * ```
 * mycli v1.0.0
 *
 * USAGE
 *   mycli <command> [options]
 *
 * COMMANDS
 *   deploy    Deploy the application
 *   dev       Start development mode
 *   db        Database commands
 *
 * FLAGS
 *   --help, -h       Show help
 *   --version, -v    Show version
 * ```
 */
export declare function renderGlobalHelp(commands: Command[], options?: HelpOptions): string;
/**
 * Generate help text for a specific command.
 *
 * Output format:
 * ```
 * Deploy the application
 *
 * USAGE
 *   mycli deploy <environment> [options]
 *
 * ARGUMENTS
 *   environment    Target environment (required)
 *
 * FLAGS
 *   --force, -f          Force deployment (default: false)
 *   --replicas, -r <n>   Number of replicas
 *
 * SUBCOMMANDS
 *   rollback    Rollback the deployment
 * ```
 */
export declare function renderCommandHelp(cmd: Command, options?: HelpOptions): string;
//# sourceMappingURL=help.d.ts.map