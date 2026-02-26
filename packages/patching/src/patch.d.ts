import type { PatchOptions } from "./types.js";
export declare function patch(filePath: string, options: PatchOptions): Promise<boolean>;
export declare function append(filePath: string, content: string): Promise<void>;
export declare function prepend(filePath: string, content: string): Promise<void>;
export declare function exists(filePath: string, pattern: string | RegExp): Promise<boolean>;
//# sourceMappingURL=patch.d.ts.map