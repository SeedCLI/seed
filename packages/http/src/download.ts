import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { HttpError } from "./errors.js";
import type { DownloadOptions, DownloadProgress } from "./types.js";

export async function download(
	url: string,
	dest: string,
	options?: DownloadOptions,
): Promise<void> {
	await mkdir(dirname(dest), { recursive: true });

	const response = await fetch(url, {
		headers: options?.headers,
		signal: options?.signal,
	});

	if (!response.ok) {
		await response.body?.cancel();
		throw new HttpError(response.status, response.statusText, undefined, { url });
	}

	if (!response.body) {
		throw new Error("Response body is empty");
	}

	const totalHeader = response.headers.get("content-length");
	const parsedTotal = totalHeader ? parseInt(totalHeader, 10) : null;
	const total = parsedTotal !== null && !Number.isNaN(parsedTotal) ? parsedTotal : null;

	if (!options?.onProgress) {
		// Fast path: stream to disk without progress tracking
		const file = Bun.file(dest);
		const writer = file.writer();
		const reader = response.body.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				writer.write(value);
			}
		} finally {
			reader.releaseLock();
			try {
				await writer.end();
			} catch {
				// Prevent writer.end() from masking the original error
			}
		}
		return;
	}

	// Stream to disk with progress reporting
	let transferred = 0;
	const startTime = Date.now();
	const file = Bun.file(dest);
	const writer = file.writer();

	const reader = response.body.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			writer.write(value);
			transferred += value.length;

			const elapsed = (Date.now() - startTime) / 1000;
			const speed = elapsed > 0 ? transferred / elapsed : 0;
			const progress: DownloadProgress = {
				total,
				transferred,
				percent: total ? Math.round((transferred / total) * 100) : 0,
				speed,
			};
			options.onProgress(progress);
		}
	} finally {
		reader.releaseLock();
		try {
			await writer.end();
		} catch {
			// Prevent writer.end() from masking the original error
		}
	}
}
