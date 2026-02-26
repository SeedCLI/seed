import type { Command } from "../types/command.js";
export interface RouteResult {
    /** The matched command (null if not found) */
    command: Command | null;
    /** Remaining argv after stripping command tokens */
    argv: string[];
    /** Suggestions if command was not found */
    suggestions: CommandSuggestion[];
}
export interface CommandSuggestion {
    name: string;
    description?: string;
    distance: number;
}
/**
 * Route argv to a registered command.
 *
 * Algorithm:
 * 1. Split argv into tokens
 * 2. Try exact match (including aliases)
 * 3. Try subcommand matching (e.g., ["db", "migrate"] → db.subcommands.migrate)
 * 4. If no match, compute fuzzy suggestions
 * 5. Return { command, argv, suggestions }
 */
export declare function route(argv: string[], commands: Command[]): RouteResult;
/**
 * Flatten all commands (including subcommands) into a flat list.
 * Useful for help generation.
 */
export declare function flattenCommands(commands: Command[], prefix?: string): Array<{
    fullName: string;
    command: Command;
}>;
//# sourceMappingURL=router.d.ts.map