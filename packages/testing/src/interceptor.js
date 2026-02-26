export function createInterceptor() {
    let originalLog;
    let originalError;
    let originalWrite;
    let originalErrWrite;
    let originalExitCode;
    const state = {
        stdout: "",
        stderr: "",
        exitCode: 0,
        start() {
            state.stdout = "";
            state.stderr = "";
            state.exitCode = 0;
            originalLog = console.log;
            originalError = console.error;
            originalWrite = process.stdout.write;
            originalErrWrite = process.stderr.write;
            originalExitCode = process.exitCode;
            console.log = (...args) => {
                state.stdout += `${args.map(String).join(" ")}\n`;
            };
            console.error = (...args) => {
                state.stderr += `${args.map(String).join(" ")}\n`;
            };
            process.stdout.write = ((chunk) => {
                state.stdout += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
                return true;
            });
            process.stderr.write = ((chunk) => {
                state.stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
                return true;
            });
            process.exitCode = undefined;
        },
        stop() {
            state.exitCode = Number(process.exitCode ?? 0);
            console.log = originalLog;
            console.error = originalError;
            process.stdout.write = originalWrite;
            process.stderr.write = originalErrWrite;
            process.exitCode = originalExitCode;
        },
    };
    return state;
}
//# sourceMappingURL=interceptor.js.map