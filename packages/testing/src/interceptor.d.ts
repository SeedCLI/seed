/**
 * Intercepts console.log, console.error, and process.exitCode
 * to capture CLI output during test runs.
 */
export interface Interceptor {
    stdout: string;
    stderr: string;
    exitCode: number;
    start(): void;
    stop(): void;
}
export declare function createInterceptor(): Interceptor;
//# sourceMappingURL=interceptor.d.ts.map