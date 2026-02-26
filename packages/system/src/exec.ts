import { ExecError, ExecTimeoutError } from "./errors.js";
import type { ExecOptions, ExecResult } from "./types.js";

export async function exec(command: string, options?: ExecOptions): Promise<ExecResult> {
	const throwOnError = options?.throwOnError ?? true;
	const useShell = options?.shell ?? true;

	const args = useShell ? ["sh", "-c", command] : command.split(/\s+/);
	const cmd = args[0];
	const cmdArgs = args.slice(1);

	const proc = Bun.spawn([cmd, ...cmdArgs], {
		cwd: options?.cwd,
		env: options?.env ? { ...process.env, ...options.env } : undefined,
		stdout: options?.stream ? "inherit" : "pipe",
		stderr: options?.stream ? "inherit" : "pipe",
		stdin: options?.stdin ? "pipe" : undefined,
	});

	// Write stdin if provided
	if (options?.stdin && proc.stdin) {
		const data =
			typeof options.stdin === "string" ? new TextEncoder().encode(options.stdin) : options.stdin;
		proc.stdin.write(data);
		proc.stdin.end();
	}

	// Handle timeout
	if (options?.timeout) {
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			proc.kill();
		}, options.timeout);

		try {
			const exitCode = await proc.exited;

			const stdout = options?.stream ? "" : await new Response(proc.stdout).text();
			const stderr = options?.stream ? "" : await new Response(proc.stderr).text();

			clearTimeout(timer);

			if (timedOut) {
				throw new ExecTimeoutError(command, options.timeout);
			}

			if (throwOnError && exitCode !== 0) {
				throw new ExecError(command, exitCode, stdout, stderr);
			}

			return { stdout, stderr, exitCode };
		} catch (err) {
			clearTimeout(timer);
			throw err;
		}
	}

	const exitCode = await proc.exited;

	const stdout = options?.stream ? "" : await new Response(proc.stdout).text();
	const stderr = options?.stream ? "" : await new Response(proc.stderr).text();

	if (throwOnError && exitCode !== 0) {
		throw new ExecError(command, exitCode, stdout, stderr);
	}

	return { stdout, stderr, exitCode };
}
