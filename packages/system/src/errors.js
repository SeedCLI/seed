export class ExecError extends Error {
    command;
    exitCode;
    stdout;
    stderr;
    constructor(command, exitCode, stdout, stderr) {
        super(`Command failed: ${command} (exit code ${exitCode})\n${stderr}`);
        this.name = "ExecError";
        this.command = command;
        this.exitCode = exitCode;
        this.stdout = stdout;
        this.stderr = stderr;
    }
}
export class ExecTimeoutError extends Error {
    command;
    timeout;
    constructor(command, timeout) {
        super(`Command timed out after ${timeout}ms: ${command}`);
        this.name = "ExecTimeoutError";
        this.command = command;
        this.timeout = timeout;
    }
}
//# sourceMappingURL=errors.js.map