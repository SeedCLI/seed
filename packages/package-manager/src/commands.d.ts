import type { PackageManagerName } from "./types.js";
interface CommandMap {
    install: string;
    add: string;
    addDev: string[];
    remove: string;
    run: string;
}
export declare function getCommands(name: PackageManagerName): CommandMap;
export {};
//# sourceMappingURL=commands.d.ts.map