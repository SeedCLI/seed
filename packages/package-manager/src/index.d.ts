export { getCommands } from "./commands.js";
export { detect } from "./detect.js";
export { create } from "./manager.js";
export type { InstallOptions, PackageManager, PackageManagerModule, PackageManagerName, RunOptions, } from "./types.js";
import type { InstallOptions, RunOptions } from "./types.js";
export declare function install(packages: string[], options?: InstallOptions): Promise<void>;
export declare function installDev(packages: string[], options?: InstallOptions): Promise<void>;
export declare function remove(packages: string[], options?: InstallOptions): Promise<void>;
export declare function run(script: string, options?: RunOptions): Promise<void>;
//# sourceMappingURL=index.d.ts.map