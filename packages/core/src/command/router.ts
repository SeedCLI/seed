import type { Command } from "../types/command.js";
import { levenshtein } from "./parser.js";

// ─── Router Types ───

export interface RouteResult {
	/** The matched command (null if not found) */
	command: Command | null;
	/** Remaining argv after stripping command tokens */
	argv: string[];
	/** Suggestions if command was not found */
	suggestions: CommandSuggestion[];
	/** Parent command names that were successfully matched before a subcommand lookup failed */
	matchedPath?: string[];
}

export interface CommandSuggestion {
	name: string;
	description?: string;
	distance: number;
}

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
export function route(argv: string[], commands: Command[]): RouteResult {
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
				// Propagate matchedPath through successful nested matches
				return subResult;
			}
			// If the first remaining token looks like a subcommand (not a flag)
			// and we got suggestions, surface them instead of falling through
			if (subResult.suggestions.length > 0 && !remaining[0].startsWith("-")) {
				// Build matchedPath: prepend current match to any already-matched parents
				const parentPath = [matched.name, ...(subResult.matchedPath ?? [])];
				return {
					command: null,
					argv: remaining,
					suggestions: subResult.suggestions,
					matchedPath: parentPath,
				};
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
function findCommand(name: string, commands: Command[]): Command | null {
	for (const cmd of commands) {
		if (cmd.name === name) return cmd;
		if (cmd.alias?.includes(name)) return cmd;
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
function getSuggestions(input: string, commands: Command[]): CommandSuggestion[] {
	const suggestions: CommandSuggestion[] = [];
	const lowerInput = input.toLowerCase();

	for (const cmd of commands) {
		if (cmd.hidden) continue;

		// Check name and all aliases, use the best (lowest) distance
		const namesToCheck = [cmd.name, ...(cmd.alias ?? [])];
		let bestDistance = Number.POSITIVE_INFINITY;

		for (const name of namesToCheck) {
			const lowerName = name.toLowerCase();

			// Prefix match counts as distance 0
			if (lowerName.startsWith(lowerInput)) {
				bestDistance = 0;
				break;
			}

			const dist = levenshtein(lowerInput, lowerName);
			if (dist < bestDistance) {
				bestDistance = dist;
			}
		}

		// Include if close enough (distance <= 3 or prefix match)
		if (bestDistance <= 3) {
			suggestions.push({
				name: cmd.name,
				description: cmd.description,
				distance: bestDistance,
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
export function flattenCommands(
	commands: Command[],
	prefix = "",
	depth = 0,
): Array<{ fullName: string; command: Command }> {
	if (depth > 20) {
		throw new Error(
			`Command tree exceeds maximum nesting depth (20). Possible circular reference at "${prefix}".`,
		);
	}
	const result: Array<{ fullName: string; command: Command }> = [];

	for (const cmd of commands) {
		const fullName = prefix ? `${prefix} ${cmd.name}` : cmd.name;
		result.push({ fullName, command: cmd });

		if (cmd.subcommands) {
			result.push(...flattenCommands(cmd.subcommands, fullName, depth + 1));
		}
	}

	return result;
}
