import { execSync } from "node:child_process";

export class ExecutableNotFoundError extends Error {
	execName: string;

	constructor(name: string) {
		super(
			`Executable not found: ${name}\nMake sure ${name} is installed and available in your PATH.`,
		);
		this.name = "ExecutableNotFoundError";
		this.execName = name;
	}
}

export function which(name: string): string | undefined {
	try {
		const cmd = process.platform === "win32" ? `where ${name}` : `which ${name}`;
		const result = execSync(cmd, { stdio: ["pipe", "pipe", "pipe"], encoding: "utf-8" });
		const firstLine = result.trim().split("\n")[0]?.trim();
		return firstLine || undefined;
	} catch {
		return undefined;
	}
}

export function whichOrThrow(name: string): string {
	const result = which(name);
	if (!result) {
		throw new ExecutableNotFoundError(name);
	}
	return result;
}
