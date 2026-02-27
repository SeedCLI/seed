export class ExecError extends Error {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;

	constructor(
		command: string,
		exitCode: number,
		stdout: string,
		stderr: string,
		options?: ErrorOptions,
	) {
		super(`Command failed: ${command} (exit code ${exitCode})\n${stderr}`, options);
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

	constructor(command: string, timeout: number, options?: ErrorOptions) {
		super(`Command timed out after ${timeout}ms: ${command}`, options);
		this.name = "ExecTimeoutError";
		this.command = command;
		this.timeout = timeout;
	}
}
