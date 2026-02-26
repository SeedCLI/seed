export declare class ExecutableNotFoundError extends Error {
    execName: string;
    constructor(name: string);
}
export declare function which(name: string): Promise<string | undefined>;
export declare function whichOrThrow(name: string): Promise<string>;
//# sourceMappingURL=which.d.ts.map