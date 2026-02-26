import type { CompletionInfo, ShellType } from "./types.js";
/**
 * Auto-detect shell, generate completion script, and install to the appropriate rc file.
 */
export declare function install(info: CompletionInfo, shell?: ShellType): Promise<{
    shell: ShellType;
    path: string;
}>;
//# sourceMappingURL=install.d.ts.map