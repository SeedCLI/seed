export interface BoxOptions {
    title?: string;
    titleAlignment?: "left" | "center" | "right";
    padding?: number | {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    margin?: number | {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    borderStyle?: "single" | "double" | "round" | "bold" | "singleDouble" | "doubleSingle" | "classic" | "arrow" | "none";
    borderColor?: string;
    backgroundColor?: string;
    textAlignment?: "left" | "center" | "right";
    width?: number;
    fullscreen?: boolean;
    dimBorder?: boolean;
    float?: "left" | "center" | "right";
}
export declare function box(text: string, options?: BoxOptions): string;
//# sourceMappingURL=box.d.ts.map