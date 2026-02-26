// eslint-disable-next-line @typescript-eslint/no-require-imports
import figlet from "figlet";

export interface FigletOptions {
	font?: string;
	horizontalLayout?: "default" | "full" | "fitted" | "controlled smushing" | "universal smushing";
	verticalLayout?: "default" | "full" | "fitted" | "controlled smushing" | "universal smushing";
	width?: number;
	whitespaceBreak?: boolean;
}

export function ascii(text: string, options?: FigletOptions): string {
	return figlet.textSync(text, {
		font: options?.font ?? "Standard",
		horizontalLayout: options?.horizontalLayout,
		verticalLayout: options?.verticalLayout,
		width: options?.width,
		whitespaceBreak: options?.whitespaceBreak,
	} as Record<string, unknown>);
}
