export declare function os(): "macos" | "linux" | "windows";
export declare function arch(): "x64" | "arm64" | "arm";
export declare function platform(): NodeJS.Platform;
export declare function hostname(): string;
export declare function cpus(): number;
export declare function memory(): {
    total: number;
    free: number;
};
export declare function uptime(): number;
//# sourceMappingURL=info.d.ts.map