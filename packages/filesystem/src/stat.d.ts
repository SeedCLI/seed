export interface FileInfo {
    size: number;
    created: Date;
    modified: Date;
    accessed: Date;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
    permissions: number;
}
export declare function stat(filePath: string): Promise<FileInfo>;
export declare function size(filePath: string): Promise<number>;
//# sourceMappingURL=stat.d.ts.map