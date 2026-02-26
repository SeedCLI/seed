export declare class FileNotFoundError extends Error {
    path: string;
    constructor(filePath: string);
}
export declare class PermissionError extends Error {
    path: string;
    constructor(filePath: string);
}
export declare class DirectoryNotEmptyError extends Error {
    path: string;
    constructor(dirPath: string);
}
//# sourceMappingURL=errors.d.ts.map