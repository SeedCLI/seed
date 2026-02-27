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
	const result = Bun.which(name);
	return result ?? undefined;
}

export function whichOrThrow(name: string): string {
	const result = Bun.which(name);
	if (!result) {
		throw new ExecutableNotFoundError(name);
	}
	return result;
}
