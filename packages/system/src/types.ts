export interface ExecOptions {
	cwd?: string;
	env?: Record<string, string>;
	stream?: boolean;
	stdin?: string | Buffer;
	timeout?: number;
	throwOnError?: boolean;
	shell?: boolean;
	/** Trim trailing whitespace from stdout/stderr (default: true) */
	trim?: boolean;
}

export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}
