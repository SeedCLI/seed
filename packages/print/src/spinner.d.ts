export interface Spinner {
    text: string;
    succeed(text?: string): void;
    fail(text?: string): void;
    warn(text?: string): void;
    info(text?: string): void;
    stop(): void;
    isSpinning: boolean;
}
/**
 * Create a spinner with the given message.
 */
export declare function spin(message: string): Spinner;
//# sourceMappingURL=spinner.d.ts.map