import { execa } from "execa";
import { ExecError, ExecTimeoutError } from "./errors.js";
import type { ExecOptions, ExecResult } from "./types.js";

export async function exec(command: string, options?: ExecOptions): Promise<ExecResult> {
	const throwOnError = options?.throwOnError ?? true;
	const useShell = options?.shell ?? true;

	const isWin = process.platform === "win32";
	let cmd: string;
	let args: string[];
	if (useShell) {
		if (isWin) {
			cmd = "cmd";
			args = ["/c", command];
		} else {
			cmd = "sh";
			args = ["-c", command];
		}
	} else {
		// Parse quoted strings: supports "double quotes" and 'single quotes'
		const parsed: string[] = [];
		const regex = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;
		for (const match of command.matchAll(regex)) {
			parsed.push(match[1] ?? match[2] ?? match[3]);
		}
		if (parsed.length === 0) {
			throw new ExecError(command || "(empty)", 1, "", "Empty command");
		}
		cmd = parsed[0];
		args = parsed.slice(1);
	}

	if (useShell && !command) {
		throw new ExecError("(empty)", 1, "", "Empty command");
	}

	const shouldTrim = options?.trim !== false;

	const inputOpts: Record<string, unknown> = {
		cwd: options?.cwd,
		env: options?.env ? { ...process.env, ...options.env } : undefined,
		timeout: options?.timeout,
		reject: false,
		stripFinalNewline: shouldTrim,
		stdin: options?.stdin ? "pipe" : undefined,
		stdout: options?.stream ? "inherit" : "pipe",
		stderr: options?.stream ? "inherit" : "pipe",
		// execa's input option for stdin data
		...(options?.stdin
			? {
					input:
						typeof options.stdin === "string"
							? options.stdin
							: Buffer.isBuffer(options.stdin)
								? options.stdin
								: options.stdin,
				}
			: {}),
	};

	try {
		const result: { stdout?: string; stderr?: string; exitCode?: number; timedOut?: boolean } =
			await execa(cmd, args, inputOpts as any);

		const stdout = options?.stream
			? ""
			: shouldTrim
				? (result.stdout?.trimEnd() ?? "")
				: (result.stdout ?? "");
		const stderr = options?.stream
			? ""
			: shouldTrim
				? (result.stderr?.trimEnd() ?? "")
				: (result.stderr ?? "");
		const exitCode = result.exitCode ?? 0;

		if (result.timedOut) {
			throw new ExecTimeoutError(command, options?.timeout ?? 0);
		}

		if (throwOnError && exitCode !== 0) {
			throw new ExecError(command, exitCode, stdout, stderr);
		}

		return { stdout, stderr, exitCode };
	} catch (err) {
		if (err instanceof ExecError || err instanceof ExecTimeoutError) {
			throw err;
		}
		// Handle execa errors that carry timedOut / exitCode
		const execaErr = err as {
			timedOut?: boolean;
			exitCode?: number;
			stdout?: string;
			stderr?: string;
		};
		if (execaErr.timedOut) {
			throw new ExecTimeoutError(command, options?.timeout ?? 0);
		}
		const stdout = options?.stream
			? ""
			: shouldTrim
				? (execaErr.stdout?.trimEnd() ?? "")
				: (execaErr.stdout ?? "");
		const stderr = options?.stream
			? ""
			: shouldTrim
				? (execaErr.stderr?.trimEnd() ?? "")
				: (execaErr.stderr ?? "");
		const exitCode = execaErr.exitCode ?? 1;

		if (throwOnError && exitCode !== 0) {
			throw new ExecError(command, exitCode, stdout, stderr);
		}

		return { stdout, stderr, exitCode };
	}
}
