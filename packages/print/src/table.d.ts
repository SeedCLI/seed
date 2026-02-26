export type BorderStyle = "single" | "double" | "rounded" | "bold" | "none";
export type Alignment = "left" | "center" | "right";
export interface ColumnConfig {
    alignment?: Alignment;
    width?: number;
    truncate?: boolean;
}
export interface TableOptions {
    headers?: string[];
    border?: BorderStyle;
    columns?: Record<number, ColumnConfig>;
    maxWidth?: number;
    headerColor?: (text: string) => string;
}
export declare function table(rows: string[][], options?: TableOptions): string;
//# sourceMappingURL=table.d.ts.map