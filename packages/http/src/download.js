import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
export async function download(url, dest, options) {
    await mkdir(dirname(dest), { recursive: true });
    const response = await fetch(url, {
        headers: options?.headers,
        signal: options?.signal,
    });
    if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
    }
    if (!response.body) {
        throw new Error("Response body is empty");
    }
    const totalHeader = response.headers.get("content-length");
    const total = totalHeader ? parseInt(totalHeader, 10) : null;
    let transferred = 0;
    const startTime = Date.now();
    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(value);
        transferred += value.length;
        if (options?.onProgress) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? transferred / elapsed : 0;
            const progress = {
                total,
                transferred,
                percent: total ? Math.round((transferred / total) * 100) : 0,
                speed,
            };
            options.onProgress(progress);
        }
    }
    const fullBuffer = new Uint8Array(transferred);
    let offset = 0;
    for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
    }
    await Bun.write(dest, fullBuffer);
}
//# sourceMappingURL=download.js.map