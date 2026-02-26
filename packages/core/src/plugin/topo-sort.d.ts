import type { ExtensionConfig } from "../types/extension.js";
/**
 * Topologically sort extensions by their dependencies using Kahn's algorithm.
 * Extensions with no dependencies come first.
 * Throws ExtensionCycleError if a circular dependency is detected.
 */
export declare function topoSort(extensions: ExtensionConfig[]): ExtensionConfig[];
//# sourceMappingURL=topo-sort.d.ts.map