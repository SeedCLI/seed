import { FileNotFoundError, PermissionError } from "./errors.js";

function handleError(err: unknown, filePath: string): never {
	if (err instanceof Error) {
		if ("code" in err && err.code === "ENOENT") {
			throw new FileNotFoundError(filePath);
		}
		if ("code" in err && err.code === "EACCES") {
			throw new PermissionError(filePath);
		}
	}
	throw err;
}

export async function read(filePath: string, _encoding?: BufferEncoding): Promise<string> {
	try {
		const file = Bun.file(filePath);
		// Bun.file().text() always returns UTF-8; encoding param reserved for future use
		return await file.text();
	} catch (err) {
		return handleError(err, filePath);
	}
}

export async function readJson<T = unknown>(filePath: string): Promise<T> {
	const content = await read(filePath);
	return JSON.parse(content) as T;
}

export async function readBuffer(filePath: string): Promise<Buffer> {
	try {
		const file = Bun.file(filePath);
		const arrayBuffer = await file.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} catch (err) {
		return handleError(err, filePath);
	}
}

export async function readToml<T = unknown>(filePath: string): Promise<T> {
	const content = await read(filePath);
	return Bun.TOML.parse(content) as T;
}

export async function readYaml<T = unknown>(filePath: string): Promise<T> {
	const { parse } = await import("yaml");
	const content = await read(filePath);
	return parse(content) as T;
}
