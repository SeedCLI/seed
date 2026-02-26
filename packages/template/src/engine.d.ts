import type { RenderOptions } from "./types.js";
export declare function renderString(template: string, props?: Record<string, unknown>): Promise<string>;
export declare function renderFile(filePath: string, props?: Record<string, unknown>): Promise<string>;
export declare function render(options: RenderOptions): Promise<string>;
//# sourceMappingURL=engine.d.ts.map