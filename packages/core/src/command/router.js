import { levenshtein } from "./parser.js";
// ─── Router ───
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
export function route(argv, commands) {
    if (argv.length === 0) {
        return { command: null, argv: [], suggestions: [] };
    }
    const token = argv[0];
    // 1. Exact match by name or alias
    const matched = findCommand(token, commands);
    if (matched) {
        const remaining = argv.slice(1);
        // 2. Try subcommand resolution
        if (matched.subcommands && matched.subcommands.length > 0 && remaining.length > 0) {
            const subResult = route(remaining, matched.subcommands);
            if (subResult.command) {
                return subResult;
            }
        }
        return { command: matched, argv: remaining, suggestions: [] };
    }
    // 3. No match — compute suggestions
    const suggestions = getSuggestions(token, commands);
    return { command: null, argv, suggestions };
}
// ─── Helpers ───
/**
 * Find a command by exact name or alias match.
 */
function findCommand(name, commands) {
    for (const cmd of commands) {
        if (cmd.name === name)
            return cmd;
        if (cmd.alias?.includes(name))
            return cmd;
    }
    return null;
}
/**
 * Get fuzzy suggestions for an unrecognized command name.
 *
 * Returns commands sorted by Levenshtein distance, filtered to:
 * - distance ≤ 3, or
 * - input is a prefix of the command name
 */
function getSuggestions(input, commands) {
    const suggestions = [];
    const lowerInput = input.toLowerCase();
    for (const cmd of commands) {
        if (cmd.hidden)
            continue;
        const distance = levenshtein(lowerInput, cmd.name.toLowerCase());
        // Include if close enough or if input is a prefix
        if (distance <= 3 || cmd.name.toLowerCase().startsWith(lowerInput)) {
            suggestions.push({
                name: cmd.name,
                description: cmd.description,
                distance,
            });
        }
    }
    // Sort by distance (closest first)
    suggestions.sort((a, b) => a.distance - b.distance);
    return suggestions;
}
/**
 * Flatten all commands (including subcommands) into a flat list.
 * Useful for help generation.
 */
export function flattenCommands(commands, prefix = "") {
    const result = [];
    for (const cmd of commands) {
        const fullName = prefix ? `${prefix} ${cmd.name}` : cmd.name;
        result.push({ fullName, command: cmd });
        if (cmd.subcommands) {
            result.push(...flattenCommands(cmd.subcommands, fullName));
        }
    }
    return result;
}
//# sourceMappingURL=router.js.map