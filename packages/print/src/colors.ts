import chalk from "chalk";

/**
 * Semantic color theme — inspired by Gluegun's print-tools.
 *
 * Extends chalk with semantic color aliases so you can write
 * `colors.success("Done")` instead of `colors.green("Done")`.
 *
 * All standard chalk methods (`.red`, `.bold`, `.hex(...)`, etc.)
 * remain available via the spread.
 */
export const colors = Object.assign(chalk, {
	/** Highlight / accent — cyan + bold */
	highlight: (text: string) => chalk.cyan.bold(text),
	/** Informational — default/reset (no color) */
	info: (text: string) => chalk.reset(text),
	/** Warning — yellow */
	warning: (text: string) => chalk.yellow(text),
	/** Success — green */
	success: (text: string) => chalk.green(text),
	/** Error — red */
	error: (text: string) => chalk.red(text),
	/** Divider/line — gray */
	line: (text: string) => chalk.gray(text),
	/** De-emphasized — gray */
	muted: (text: string) => chalk.gray(text),
});
