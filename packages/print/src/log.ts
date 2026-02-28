import { box as renderBox } from "./box.js";
import { colors } from "./colors.js";
import { divider as renderDivider } from "./divider.js";
import { ascii as renderAscii } from "./figlet.js";
import { columns, indent, wrap } from "./format.js";
import { keyValue as renderKeyValue } from "./keyValue.js";
import { progressBar } from "./progress.js";
import { spin } from "./spinner.js";
import { table as renderTable } from "./table.js";
import { tree as renderTree } from "./tree.js";
import type { PrintModule } from "./types.js";

let debugEnabled = false;

export function setDebugMode(enabled: boolean): void {
	debugEnabled = enabled;
}

export function info(message: string): void {
	console.log(message);
}

export function success(message: string): void {
	console.log(colors.success(`✔ ${message}`));
}

export function warning(message: string): void {
	console.log(colors.warning(`⚠ ${message}`));
}

export function error(message: string): void {
	console.error(colors.error(`✖ ${message}`));
}

export function debug(message: string): void {
	if (debugEnabled) {
		console.log(colors.muted(`● ${message}`));
	}
}

export function highlight(message: string): void {
	console.log(colors.highlight(message));
}

export function muted(message: string): void {
	console.log(colors.muted(message));
}

export function newline(count = 1): void {
	for (let i = 0; i < count; i++) {
		console.log();
	}
}

/**
 * The print module object — passed to commands via the seed context.
 */
export const print: PrintModule = {
	info,
	success,
	warning,
	error,
	debug,
	highlight,
	muted,
	newline,
	colors,
	spin,
	table(rows, options) {
		console.log(renderTable(rows, options));
	},
	box(text, options) {
		console.log(renderBox(text, options));
	},
	ascii(text, options) {
		console.log(renderAscii(text, options));
	},
	tree(root, options) {
		console.log(renderTree(root, options));
	},
	keyValue(pairs, options) {
		console.log(renderKeyValue(pairs, options));
	},
	divider(options) {
		console.log(renderDivider(options));
	},
	progressBar,
	columns,
	indent,
	wrap,
};
