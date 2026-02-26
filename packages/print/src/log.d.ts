import type { PrintModule } from "./types.js";
export declare function setDebugMode(enabled: boolean): void;
export declare function info(message: string): void;
export declare function success(message: string): void;
export declare function warning(message: string): void;
export declare function error(message: string): void;
export declare function debug(message: string): void;
export declare function highlight(message: string): void;
export declare function muted(message: string): void;
export declare function newline(count?: number): void;
/**
 * The print module object — passed to commands via the toolbox.
 */
export declare const print: PrintModule;
//# sourceMappingURL=log.d.ts.map