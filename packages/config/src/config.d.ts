import type { LoadOptions, ResolvedConfig } from "./types.js";
export declare function load<T extends Record<string, unknown> = Record<string, unknown>>(nameOrOptions: string | LoadOptions<T>, opts?: Omit<LoadOptions<T>, "name">): Promise<ResolvedConfig<T>>;
export declare function loadFile<T extends Record<string, unknown> = Record<string, unknown>>(filePath: string): Promise<T>;
export declare function get<T = unknown>(obj: Record<string, unknown>, path: string, defaultValue?: T): T;
//# sourceMappingURL=config.d.ts.map