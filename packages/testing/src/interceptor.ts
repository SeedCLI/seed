/**
 * Intercepts console.log, console.error, and process.exitCode
 * to capture CLI output during test runs.
 *
 * Uses a stack-based save/restore pattern so nested or concurrent
 * interceptors don't corrupt each other's global patches.
 */
export interface Interceptor {
	stdout: string;
	stderr: string;
	exitCode: number;
	start(): void;
	stop(): void;
}

interface SavedGlobals {
	log: typeof console.log;
	warn: typeof console.warn;
	error: typeof console.error;
	stdoutWrite: typeof process.stdout.write;
	stderrWrite: typeof process.stderr.write;
	exitCode: number | string | null | undefined;
}

// Stack of saved globals so nested interceptors restore correctly
const globalStack: SavedGlobals[] = [];

export function createInterceptor(): Interceptor {
	let started = false;
	let stackIndex = -1;

	const state: Interceptor = {
		stdout: "",
		stderr: "",
		exitCode: 0,

		start() {
			state.stdout = "";
			state.stderr = "";
			state.exitCode = 0;
			started = true;

			// Track this interceptor's position in the stack
			stackIndex = globalStack.length;

			// Push current globals onto the stack before patching
			globalStack.push({
				log: console.log,
				warn: console.warn,
				error: console.error,
				stdoutWrite: process.stdout.write,
				stderrWrite: process.stderr.write,
				exitCode: process.exitCode,
			});

			// Reset to 0 so we detect only changes made during the intercepted run
			process.exitCode = 0;

			console.log = (...args: unknown[]) => {
				state.stdout += `${args.map(String).join(" ")}\n`;
			};

			console.warn = (...args: unknown[]) => {
				state.stderr += `${args.map(String).join(" ")}\n`;
			};

			console.error = (...args: unknown[]) => {
				state.stderr += `${args.map(String).join(" ")}\n`;
			};

			process.stdout.write = ((...writeArgs: unknown[]) => {
				const chunk = writeArgs[0] as string | Uint8Array;
				const encoding = typeof writeArgs[1] === "string" ? writeArgs[1] : undefined;
				if (typeof chunk === "string") {
					state.stdout += chunk;
				} else {
					state.stdout += new TextDecoder(encoding ?? "utf-8").decode(chunk);
				}
				// Invoke callback if provided (2nd or 3rd arg depending on overload)
				const cb = typeof writeArgs[1] === "function" ? writeArgs[1] : writeArgs[2];
				if (typeof cb === "function") (cb as () => void)();
				return true;
			}) as typeof process.stdout.write;

			process.stderr.write = ((...writeArgs: unknown[]) => {
				const chunk = writeArgs[0] as string | Uint8Array;
				const encoding = typeof writeArgs[1] === "string" ? writeArgs[1] : undefined;
				if (typeof chunk === "string") {
					state.stderr += chunk;
				} else {
					state.stderr += new TextDecoder(encoding ?? "utf-8").decode(chunk);
				}
				const cb = typeof writeArgs[1] === "function" ? writeArgs[1] : writeArgs[2];
				if (typeof cb === "function") (cb as () => void)();
				return true;
			}) as typeof process.stderr.write;
		},

		stop() {
			if (!started) return; // Guard against stop() without start()
			started = false;

			state.exitCode = Number(process.exitCode ?? 0);

			// Validate LIFO order — interceptors must be stopped in reverse start order
			const outOfOrder = stackIndex !== globalStack.length - 1;

			if (outOfOrder) {
				// Still restore globals to prevent permanent pollution
				// Truncate stack from this point (nested interceptors above are invalid)
				const saved = globalStack[stackIndex];
				globalStack.length = stackIndex;
				if (saved) {
					console.log = saved.log;
					console.warn = saved.warn;
					console.error = saved.error;
					process.stdout.write = saved.stdoutWrite;
					process.stderr.write = saved.stderrWrite;
					process.exitCode = Number(saved.exitCode ?? 0);
				}
				throw new Error(
					"Interceptors must be stopped in reverse order (LIFO). " +
						`Expected stack index ${globalStack.length}, but this interceptor is at ${stackIndex}.`,
				);
			}

			// Pop saved globals from the stack (restores previous interceptor or original)
			const saved = globalStack.pop();
			if (saved) {
				console.log = saved.log;
				console.warn = saved.warn;
				console.error = saved.error;
				process.stdout.write = saved.stdoutWrite;
				process.stderr.write = saved.stderrWrite;
				// Bun ignores `process.exitCode = undefined`, so use 0 as fallback
				process.exitCode = Number(saved.exitCode ?? 0);
			}
		},
	};

	return state;
}
