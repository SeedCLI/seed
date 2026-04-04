import { readFile } from "node:fs/promises";
import { parse as parseToml } from "smol-toml";
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

export async function read(filePath: string, encoding?: BufferEncoding): Promise<string> {
	try {
		if (encoding && encoding !== "utf-8" && encoding !== "utf8") {
			const buf = await readFile(filePath);
			return new TextDecoder(encoding).decode(buf);
		}
		return await readFile(filePath, "utf-8");
	} catch (err) {
		return handleError(err, filePath);
	}
}

export async function readJson<T = unknown>(filePath: string): Promise<T> {
	const content = await read(filePath);
	try {
		return JSON.parse(content) as T;
	} catch (err) {
		throw new Error(
			`Failed to parse JSON in "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}

export async function readBuffer(filePath: string): Promise<Buffer> {
	try {
		return await readFile(filePath);
	} catch (err) {
		return handleError(err, filePath);
	}
}

export async function readToml<T = unknown>(filePath: string): Promise<T> {
	const content = await read(filePath);
	try {
		return parseToml(content) as T;
	} catch (err) {
		throw new Error(
			`Failed to parse TOML in "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}

export async function readYaml<T = unknown>(filePath: string): Promise<T> {
	const { parse } = await import("yaml");
	const content = await read(filePath);
	try {
		return parse(content) as T;
	} catch (err) {
		throw new Error(
			`Failed to parse YAML in "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}
