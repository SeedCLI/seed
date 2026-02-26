import type chalk from "chalk";
import type { BoxOptions } from "./box.js";
import type { DividerOptions } from "./divider.js";
import type { FigletOptions } from "./figlet.js";
import type { KeyValueOptions, KeyValuePair } from "./keyValue.js";
import type { ProgressBar, ProgressBarOptions } from "./progress.js";
import type { Spinner } from "./spinner.js";
import type { TableOptions } from "./table.js";
import type { TreeNode, TreeOptions } from "./tree.js";

export interface PrintModule {
	info(message: string): void;
	success(message: string): void;
	warning(message: string): void;
	error(message: string): void;
	debug(message: string): void;
	highlight(message: string): void;
	muted(message: string): void;
	newline(count?: number): void;
	colors: typeof chalk;
	spin(message: string): Spinner;
	table(rows: string[][], options?: TableOptions): void;
	box(text: string, options?: BoxOptions): void;
	ascii(text: string, options?: FigletOptions): void;
	tree(root: TreeNode, options?: TreeOptions): void;
	keyValue(pairs: KeyValuePair[] | Record<string, string>, options?: KeyValueOptions): void;
	divider(options?: DividerOptions): void;
	progressBar(options: ProgressBarOptions): ProgressBar;
}
