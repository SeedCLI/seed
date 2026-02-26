export interface ProgressBarOptions {
    total: number;
    width?: number;
    complete?: string;
    incomplete?: string;
    format?: string;
}
export interface ProgressBar {
    update(current: number): string;
    done(): string;
}
export declare function progressBar(options: ProgressBarOptions): ProgressBar;
//# sourceMappingURL=progress.d.ts.map