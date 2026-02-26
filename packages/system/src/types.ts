export interface ExecOptions {
	cwd?: string;
	env?: Record<string, string>;
	stream?: boolean;
	stdin?: string | Buffer;
	timeout?: number;
	throwOnError?: boolean;
	shell?: boolean;
}

export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}
