import { stat } from "node:fs/promises";

export async function exists(filePath: string): Promise<boolean> {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function isFile(filePath: string): Promise<boolean> {
	try {
		const s = await stat(filePath);
		return s.isFile();
	} catch {
		return false;
	}
}

export async function isDirectory(filePath: string): Promise<boolean> {
	try {
		const s = await stat(filePath);
		return s.isDirectory();
	} catch {
		return false;
	}
}
