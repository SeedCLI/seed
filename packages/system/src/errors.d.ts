export declare class ExecError extends Error {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    constructor(command: string, exitCode: number, stdout: string, stderr: string);
}
export declare class ExecTimeoutError extends Error {
    command: string;
    timeout: number;
    constructor(command: string, timeout: number);
}
//# sourceMappingURL=errors.d.ts.map