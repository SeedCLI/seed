import { stat } from "node:fs/promises";
export async function exists(filePath) {
    try {
        await stat(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export async function isFile(filePath) {
    try {
        const s = await stat(filePath);
        return s.isFile();
    }
    catch {
        return false;
    }
}
export async function isDirectory(filePath) {
    try {
        const s = await stat(filePath);
        return s.isDirectory();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=exists.js.map