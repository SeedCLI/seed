export class ExecError extends Error {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;

	constructor(command: string, exitCode: number, stdout: string, stderr: string) {
		super(`Command failed: ${command} (exit code ${exitCode})\n${stderr}`);
		this.name = "ExecError";
		this.command = command;
		this.exitCode = exitCode;
		this.stdout = stdout;
		this.stderr = stderr;
	}
}

export class ExecTimeoutError extends Error {
	command: string;
	timeout: number;

	constructor(command: string, timeout: number) {
		super(`Command timed out after ${timeout}ms: ${command}`);
		this.name = "ExecTimeoutError";
		this.command = command;
		this.timeout = timeout;
	}
}
