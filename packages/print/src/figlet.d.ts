export interface FigletOptions {
    font?: string;
    horizontalLayout?: "default" | "full" | "fitted" | "controlled smushing" | "universal smushing";
    verticalLayout?: "default" | "full" | "fitted" | "controlled smushing" | "universal smushing";
    width?: number;
    whitespaceBreak?: boolean;
}
export declare function ascii(text: string, options?: FigletOptions): string;
//# sourceMappingURL=figlet.d.ts.map