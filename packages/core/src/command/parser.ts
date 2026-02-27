import { parseArgs } from "node:util";
import type { ArgDef, FlagDef } from "../types/args.js";
import type { Command } from "../types/command.js";

// ─── Error Types ───

export class ParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ParseError";
	}
}

// ─── Result Types ───

export interface ParseResult {
	args: Record<string, unknown>;
	flags: Record<string, unknown>;
	command: string | undefined;
	argv: string[];
	raw: string[];
}

// ─── Parser ───

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
export function parse(argv: string[], cmd: Command): ParseResult {
	const argDefs = cmd.args ?? {};
	const flagDefs = cmd.flags ?? {};

	// Build parseArgs options from flag definitions
	const options: Record<
		string,
		{ type: "string" | "boolean"; short?: string; multiple?: boolean }
	> = {};

	for (const [name, def] of Object.entries(flagDefs)) {
		const flagType = def.type;

		if (flagType === "boolean") {
			options[name] = { type: "boolean" };
		} else if (flagType === "string[]" || flagType === "number[]") {
			// Arrays are "string" with multiple: true (we coerce number[] later)
			options[name] = { type: "string", multiple: true };
		} else {
			// string, number — parseArgs treats both as "string" (we coerce number later)
			options[name] = { type: "string" };
		}

		if (def.alias) {
			options[name].short = def.alias;
		}
	}

	// ─── Pre-process --no-* boolean negation ───
	// Standard CLI convention: --no-verbose sets verbose=false.
	// We strip these from argv and track them, since node:util parseArgs
	// doesn't support --no-* natively.
	const booleanFlags = new Set(
		Object.entries(flagDefs)
			.filter(([, def]) => def.type === "boolean")
			.map(([name]) => name),
	);

	const negatedFlags = new Map<string, boolean>();
	const preprocessedArgv: string[] = [];

	// Find the -- separator position; tokens after it are literal positional args
	const dashDashIdx = argv.indexOf("--");
	const scanEnd = dashDashIdx === -1 ? argv.length : dashDashIdx;

	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (i < scanEnd && token.startsWith("--no-")) {
			const flagName = token.slice(5); // strip "--no-"
			if (booleanFlags.has(flagName)) {
				negatedFlags.set(flagName, false);
				continue; // Remove from argv — we'll inject the value after parsing
			}
		}
		preprocessedArgv.push(token);
	}

	// Parse with node:util parseArgs
	let parsed: {
		values: Record<string, string | boolean | (string | boolean)[] | undefined>;
		positionals: string[];
	};

	try {
		parsed = parseArgs({
			args: preprocessedArgv,
			options,
			strict: true,
			allowPositionals: true,
		});
	} catch (err) {
		if (err instanceof Error) {
			throw new ParseError(err.message);
		}
		throw err;
	}

	// Apply --no-* negations (explicit --flag=true wins over --no-flag)
	for (const [name, value] of negatedFlags) {
		if (parsed.values[name] === undefined) {
			parsed.values[name] = value;
		}
	}

	// ─── Process positional args ───

	const argEntries = Object.entries(argDefs);
	const args: Record<string, unknown> = {};

	for (let i = 0; i < argEntries.length; i++) {
		const [name, def] = argEntries[i];
		const raw = parsed.positionals[i];

		if (raw === undefined) {
			if (def.default !== undefined) {
				args[name] = def.default;
			} else if (def.required) {
				throw new ParseError(formatMissingArg(name, def, cmd));
			} else {
				args[name] = undefined;
			}
			continue;
		}

		args[name] = coerceArgValue(name, raw, def);
		validateArg(name, args[name], def);
	}

	// Warn about extra positional arguments that don't match any definition
	if (parsed.positionals.length > argEntries.length) {
		const extra = parsed.positionals.slice(argEntries.length);
		const defined = argEntries.length;
		const received = parsed.positionals.length;
		console.warn(
			`Warning: command "${cmd.name}" received ${received} positional argument${received !== 1 ? "s" : ""} but only ${defined} ${defined !== 1 ? "are" : "is"} defined. Extra arguments ignored: ${extra.join(", ")}`,
		);
	}

	// ─── Process flags ───

	const flags: Record<string, unknown> = {};

	for (const [name, def] of Object.entries(flagDefs)) {
		const raw = parsed.values[name];

		if (raw === undefined) {
			if (def.default !== undefined) {
				flags[name] = def.default;
			} else if (def.required) {
				throw new ParseError(formatMissingFlag(name, def));
			} else {
				flags[name] = undefined;
			}
			continue;
		}

		flags[name] = coerceFlagValue(name, raw, def);
		validateFlag(name, flags[name], def);
	}

	return {
		args,
		flags,
		command: cmd.name,
		argv: parsed.positionals,
		raw: argv,
	};
}

// ─── Type Coercion ───

function coerceArgValue(name: string, raw: string, def: ArgDef): string | number {
	if (def.type === "number") {
		const num = Number(raw);
		if (!Number.isFinite(num)) {
			throw new ParseError(
				`Invalid value for argument "${name}"\n\n  Expected: number\n  Received: "${raw}"`,
			);
		}
		return num;
	}
	return raw;
}

function coerceFlagValue(
	name: string,
	raw: string | boolean | (string | boolean)[] | undefined,
	def: FlagDef,
): unknown {
	switch (def.type) {
		case "boolean":
			return raw;

		case "number": {
			const num = Number(raw);
			if (!Number.isFinite(num)) {
				throw new ParseError(
					`Invalid value for flag "--${name}"\n\n  Expected: number\n  Received: "${raw}"`,
				);
			}
			return num;
		}

		case "string":
			return raw;

		case "string[]":
			if (Array.isArray(raw)) {
				return raw.map(String);
			}
			return [String(raw)];

		case "number[]": {
			const items = Array.isArray(raw) ? raw : [raw];
			return items.map((item) => {
				const num = Number(item);
				if (!Number.isFinite(num)) {
					throw new ParseError(
						`Invalid value for flag "--${name}"\n\n  Expected: number[]\n  Received item: "${item}"`,
					);
				}
				return num;
			});
		}

		default:
			return raw;
	}
}

// ─── Validation ───

function validateArg(name: string, value: unknown, def: ArgDef): void {
	// Choices validation
	const argChoices = def.choices as readonly string[] | undefined;
	if (argChoices && argChoices.length > 0) {
		// For number args, compare numerically to avoid float coercion mismatches
		// e.g. Number("1.0") === 1, so String(1) === "1" !== "1.0"
		const isValid =
			def.type === "number"
				? argChoices.map(Number).includes(Number(value))
				: argChoices.includes(String(value));

		if (!isValid) {
			const choicesStr = argChoices.map((c: string) => `"${c}"`).join(", ");
			const suggestion = findClosest(String(value), argChoices as string[]);
			let msg = `Invalid value for argument "${name}"\n\n  Expected one of: ${choicesStr}\n  Received: "${value}"`;
			if (suggestion) {
				msg += `\n\n  Did you mean "${suggestion}"?`;
			}
			throw new ParseError(msg);
		}
	}

	// Custom validator
	if (def.validate) {
		const result = def.validate(value);
		if (result === false) {
			throw new ParseError(`Validation failed for argument "${name}"`);
		}
		if (typeof result === "string") {
			throw new ParseError(`Validation failed for argument "${name}": ${result}`);
		}
	}
}

function validateFlag(name: string, value: unknown, def: FlagDef): void {
	// Choices validation
	const flagChoices = def.choices as readonly string[] | undefined;
	if (flagChoices && flagChoices.length > 0) {
		const isNumericType = def.type === "number" || def.type === "number[]";
		const numericChoices = isNumericType ? flagChoices.map(Number) : undefined;

		// For array flags (string[], number[]), validate each element individually
		const valuesToCheck = Array.isArray(value) ? value : [value];
		for (const item of valuesToCheck) {
			// For number/number[] flags, compare numerically to avoid float coercion mismatches
			const isValid = numericChoices
				? numericChoices.includes(Number(item))
				: flagChoices.includes(String(item));

			if (!isValid) {
				const choicesStr = flagChoices.map((c: string) => `"${c}"`).join(", ");
				const suggestion = findClosest(String(item), flagChoices as string[]);
				let msg = `Invalid value for flag "--${name}"\n\n  Expected one of: ${choicesStr}\n  Received: "${item}"`;
				if (suggestion) {
					msg += `\n\n  Did you mean "${suggestion}"?`;
				}
				throw new ParseError(msg);
			}
		}
	}

	// Custom validator
	if (def.validate) {
		const result = def.validate(value);
		if (result === false) {
			throw new ParseError(`Validation failed for flag "--${name}"`);
		}
		if (typeof result === "string") {
			throw new ParseError(`Validation failed for flag "--${name}": ${result}`);
		}
	}
}

// ─── Error Formatting ───

function formatMissingArg(name: string, def: ArgDef, cmd: Command): string {
	let msg = `Missing required argument "${name}"`;
	if (def.description) {
		msg += `\n\n  ${def.description}`;
	}
	const missingArgChoices = def.choices as readonly string[] | undefined;
	if (missingArgChoices && missingArgChoices.length > 0) {
		msg += `\n  Expected one of: ${missingArgChoices.join(", ")}`;
	}
	msg += `\n\n  Usage: ${cmd.name} <${name}>`;
	return msg;
}

function formatMissingFlag(name: string, def: FlagDef): string {
	let msg = `Missing required flag "--${name}"`;
	if (def.description) {
		msg += `\n\n  ${def.description}`;
	}
	return msg;
}

// ─── Utilities ───

/**
 * Find the closest match to `input` from `candidates` using Levenshtein distance.
 * Returns null if no candidate is close enough (distance > 3).
 */
function findClosest(input: string, candidates: string[]): string | null {
	let bestMatch: string | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of candidates) {
		const dist = levenshtein(input.toLowerCase(), candidate.toLowerCase());
		if (dist < bestDistance) {
			bestDistance = dist;
			bestMatch = candidate;
		}
	}

	return bestDistance <= 3 ? bestMatch : null;
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;

	// Use a single-row DP approach for space efficiency
	const row = Array.from({ length: n + 1 }, (_, i) => i);

	for (let i = 1; i <= m; i++) {
		let prev = i;
		for (let j = 1; j <= n; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			const val = Math.min(
				row[j] + 1, // deletion
				prev + 1, // insertion
				row[j - 1] + cost, // substitution
			);
			row[j - 1] = prev;
			prev = val;
		}
		row[n] = prev;
	}

	return row[n];
}
