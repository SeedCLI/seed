export class FileNotFoundError extends Error {
    path;
    constructor(filePath) {
        super(`File not found: ${filePath}`);
        this.name = "FileNotFoundError";
        this.path = filePath;
    }
}
export class PermissionError extends Error {
    path;
    constructor(filePath) {
        super(`Permission denied: ${filePath}`);
        this.name = "PermissionError";
        this.path = filePath;
    }
}
export class DirectoryNotEmptyError extends Error {
    path;
    constructor(dirPath) {
        super(`Directory not empty: ${dirPath}`);
        this.name = "DirectoryNotEmptyError";
        this.path = dirPath;
    }
}
//# sourceMappingURL=errors.js.map