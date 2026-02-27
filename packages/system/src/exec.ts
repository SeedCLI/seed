import { ExecError, ExecTimeoutError } from "./errors.js";
import type { ExecOptions, ExecResult } from "./types.js";

export async function exec(command: string, options?: ExecOptions): Promise<ExecResult> {
	const throwOnError = options?.throwOnError ?? true;
	const useShell = options?.shell ?? true;

	const isWin = process.platform === "win32";
	let args: string[];
	if (useShell) {
		args = isWin ? ["cmd", "/c", command] : ["sh", "-c", command];
	} else {
		// Parse quoted strings: supports "double quotes" and 'single quotes'
		args = [];
		const regex = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;
		for (const match of command.matchAll(regex)) {
			args.push(match[1] ?? match[2] ?? match[3]);
		}
	}
	if (args.length === 0) {
		throw new ExecError(command || "(empty)", 1, "", "Empty command");
	}
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
		try {
			proc.stdin.write(data);
			await proc.stdin.end();
		} catch {
			// Process may have already exited; broken pipe is expected
		}
	}

	// Handle timeout
	if (options?.timeout) {
		let timedOut = false;
		let killTimer: ReturnType<typeof setTimeout> | undefined;
		const timer = setTimeout(() => {
			timedOut = true;
			// Send SIGTERM first for graceful shutdown, then SIGKILL after 2s
			proc.kill("SIGTERM");
			killTimer = setTimeout(() => {
				try {
					proc.kill("SIGKILL");
				} catch {
					// Process already exited
				}
			}, 2000);
		}, options.timeout);

		try {
			// Read stdout/stderr concurrently with process exit to avoid deadlocks
			const [stdout, stderr, exitCode] = await Promise.all([
				options?.stream ? Promise.resolve("") : new Response(proc.stdout).text(),
				options?.stream ? Promise.resolve("") : new Response(proc.stderr).text(),
				proc.exited,
			]);
			clearTimeout(timer);
			if (killTimer) clearTimeout(killTimer);

			if (timedOut) {
				throw new ExecTimeoutError(command, options.timeout);
			}

			const shouldTrim = options?.trim !== false;
			const out = shouldTrim ? stdout.trimEnd() : stdout;
			const err2 = shouldTrim ? stderr.trimEnd() : stderr;

			if (throwOnError && exitCode !== 0) {
				throw new ExecError(command, exitCode, out, err2);
			}

			return { stdout: out, stderr: err2, exitCode };
		} catch (err) {
			clearTimeout(timer);
			if (killTimer) clearTimeout(killTimer);
			throw err;
		}
	}

	// Read stdout/stderr concurrently with process exit to avoid deadlocks
	const [rawStdout, rawStderr, exitCode] = await Promise.all([
		options?.stream ? Promise.resolve("") : new Response(proc.stdout).text(),
		options?.stream ? Promise.resolve("") : new Response(proc.stderr).text(),
		proc.exited,
	]);

	const shouldTrim = options?.trim !== false;
	const stdout = shouldTrim ? rawStdout.trimEnd() : rawStdout;
	const stderr = shouldTrim ? rawStderr.trimEnd() : rawStderr;

	if (throwOnError && exitCode !== 0) {
		throw new ExecError(command, exitCode, stdout, stderr);
	}

	return { stdout, stderr, exitCode };
}
