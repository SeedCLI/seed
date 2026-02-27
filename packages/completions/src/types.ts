export type ShellType = "bash" | "zsh" | "fish" | "powershell";

export interface CompletionFlag {
	name: string;
	alias?: string;
	description?: string;
	type: string;
	choices?: readonly string[];
}

export interface CompletionArg {
	name: string;
	description?: string;
	choices?: readonly string[];
}

export interface CompletionCommand {
	name: string;
	description?: string;
	aliases?: string[];
	subcommands?: CompletionCommand[];
	flags?: CompletionFlag[];
	args?: CompletionArg[];
}

export interface CompletionInfo {
	brand: string;
	commands: CompletionCommand[];
}

/**
 * Sanitize a string for safe inclusion in a shell script.
 * Strips any characters outside [a-zA-Z0-9_-].
 */
export function sanitizeShellToken(value: string): string {
	return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * Escape a description string for shell scripts.
 * Removes backticks, $, and other dangerous characters while preserving readability.
 */
export function escapeShellDescription(value: string): string {
	return value.replace(/[`$\\!"]/g, "").replace(/'/g, "'\\''");
}
