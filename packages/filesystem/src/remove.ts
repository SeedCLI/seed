import { rm } from "node:fs/promises";

export async function remove(filePath: string): Promise<void> {
	await rm(filePath, { recursive: true, force: true });
}
