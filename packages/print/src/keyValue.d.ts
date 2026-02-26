export interface KeyValueOptions {
    separator?: string;
    keyColor?: (text: string) => string;
    valueColor?: (text: string) => string;
    indent?: number;
}
export interface KeyValuePair {
    key: string;
    value: string;
}
export declare function keyValue(pairs: KeyValuePair[] | Record<string, string>, options?: KeyValueOptions): string;
//# sourceMappingURL=keyValue.d.ts.map