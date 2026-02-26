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

export async function which(name: string): Promise<string | undefined> {
	const result = Bun.which(name);
	return result ?? undefined;
}

export async function whichOrThrow(name: string): Promise<string> {
	const result = Bun.which(name);
	if (!result) {
		throw new ExecutableNotFoundError(name);
	}
	return result;
}
