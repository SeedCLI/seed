import type { Command } from "../types/command.js";
export declare class ParseError extends Error {
    constructor(message: string);
}
export interface ParseResult {
    args: Record<string, unknown>;
    flags: Record<string, unknown>;
    command: string | undefined;
    argv: string[];
    raw: string[];
}
/**
 * Parse raw argv against a command's arg/flag definitions.
 *
 * Flow:
 * 1. Separate positional args from flags using node:util parseArgs
 * 2. Coerce types (string → number where needed)
 * 3. Apply defaults for missing optional values
 * 4. Validate required, choices, custom validators
 * 5. Return typed { args, flags } object
 */
export declare function parse(argv: string[], cmd: Command): ParseResult;
/**
 * Levenshtein distance between two strings.
 */
export declare function levenshtein(a: string, b: string): number;
//# sourceMappingURL=parser.d.ts.map