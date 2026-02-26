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

export function createInterceptor(): Interceptor {
	let originalLog: typeof console.log;
	let originalError: typeof console.error;
	let originalWrite: typeof process.stdout.write;
	let originalErrWrite: typeof process.stderr.write;
	let originalExitCode: number | string | null | undefined;

	const state: Interceptor = {
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

			console.log = (...args: unknown[]) => {
				state.stdout += `${args.map(String).join(" ")}\n`;
			};

			console.error = (...args: unknown[]) => {
				state.stderr += `${args.map(String).join(" ")}\n`;
			};

			process.stdout.write = ((chunk: string | Uint8Array) => {
				state.stdout += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
				return true;
			}) as typeof process.stdout.write;

			process.stderr.write = ((chunk: string | Uint8Array) => {
				state.stderr += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
				return true;
			}) as typeof process.stderr.write;

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
