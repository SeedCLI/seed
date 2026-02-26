export declare class HttpError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly data: unknown;
    constructor(status: number, statusText: string, data?: unknown);
}
export declare class HttpTimeoutError extends Error {
    readonly url: string;
    readonly timeout: number;
    constructor(url: string, timeout: number);
}
//# sourceMappingURL=errors.d.ts.map