import { FileNotFoundError, PermissionError } from "./errors.js";
function handleError(err, filePath) {
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
export async function read(filePath, _encoding) {
    try {
        const file = Bun.file(filePath);
        // Bun.file().text() always returns UTF-8; encoding param reserved for future use
        return await file.text();
    }
    catch (err) {
        return handleError(err, filePath);
    }
}
export async function readJson(filePath) {
    const content = await read(filePath);
    return JSON.parse(content);
}
export async function readBuffer(filePath) {
    try {
        const file = Bun.file(filePath);
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    catch (err) {
        return handleError(err, filePath);
    }
}
export async function readToml(filePath) {
    const content = await read(filePath);
    return Bun.TOML.parse(content);
}
export async function readYaml(filePath) {
    const { parse } = await import("yaml");
    const content = await read(filePath);
    return parse(content);
}
//# sourceMappingURL=read.js.map