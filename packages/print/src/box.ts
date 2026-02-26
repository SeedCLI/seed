import boxen from "boxen";

export interface BoxOptions {
	title?: string;
	titleAlignment?: "left" | "center" | "right";
	padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
	margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
	borderStyle?:
		| "single"
		| "double"
		| "round"
		| "bold"
		| "singleDouble"
		| "doubleSingle"
		| "classic"
		| "arrow"
		| "none";
	borderColor?: string;
	backgroundColor?: string;
	textAlignment?: "left" | "center" | "right";
	width?: number;
	fullscreen?: boolean;
	dimBorder?: boolean;
	float?: "left" | "center" | "right";
}

export function box(text: string, options?: BoxOptions): string {
	const opts: Record<string, unknown> = {
		borderStyle: options?.borderStyle ?? "round",
	};

	if (options?.title !== undefined) opts.title = options.title;
	if (options?.titleAlignment !== undefined) opts.titleAlignment = options.titleAlignment;
	if (options?.padding !== undefined) opts.padding = options.padding;
	if (options?.margin !== undefined) opts.margin = options.margin;
	if (options?.borderColor !== undefined) opts.borderColor = options.borderColor;
	if (options?.backgroundColor !== undefined) opts.backgroundColor = options.backgroundColor;
	if (options?.textAlignment !== undefined) opts.textAlignment = options.textAlignment;
	if (options?.width !== undefined) opts.width = options.width;
	if (options?.fullscreen !== undefined) opts.fullscreen = options.fullscreen;
	if (options?.dimBorder !== undefined) opts.dimBorder = options.dimBorder;
	if (options?.float !== undefined) opts.float = options.float;

	return boxen(text, opts);
}
