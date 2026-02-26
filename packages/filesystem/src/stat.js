import { stat as fsStat, lstat } from "node:fs/promises";
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
export async function stat(filePath) {
    try {
        const [stats, lstats] = await Promise.all([fsStat(filePath), lstat(filePath)]);
        return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            accessed: stats.atime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymlink: lstats.isSymbolicLink(),
            permissions: stats.mode & 0o777,
        };
    }
    catch (err) {
        return handleError(err, filePath);
    }
}
export async function size(filePath) {
    const info = await stat(filePath);
    return info.size;
}
//# sourceMappingURL=stat.js.map