import type { ConfigModule } from "@seedcli/config";
import type { HttpModule } from "@seedcli/http";
import type { PackageManagerModule } from "@seedcli/package-manager";
import type { PatchingModule } from "@seedcli/patching";
import type { PrintModule } from "@seedcli/print";
import type { PromptModule } from "@seedcli/prompt";
import type { StringsModule } from "@seedcli/strings";
import type { TemplateModule } from "@seedcli/template";
/**
 * Empty interface — plugins extend this via declaration merging.
 *
 * Example (in a plugin's types.ts):
 * ```ts
 * declare module "@seedcli/core" {
 *   interface ToolboxExtensions {
 *     deploy: {
 *       toS3(bucket: string, path: string): Promise<void>;
 *     };
 *   }
 * }
 * ```
 */
export interface ToolboxExtensions {
}
/**
 * The toolbox is the main object passed to every command's `run` function.
 * It provides access to all framework modules and per-command typed args/flags.
 */
export interface Toolbox<TArgs = Record<string, never>, TFlags = Record<string, never>> extends ToolboxExtensions {
    args: TArgs;
    flags: TFlags;
    parameters: {
        raw: string[];
        argv: string[];
        command: string | undefined;
    };
    print?: PrintModule;
    prompt?: PromptModule;
    filesystem?: typeof import("@seedcli/filesystem");
    system?: typeof import("@seedcli/system");
    http?: HttpModule;
    template?: TemplateModule;
    strings?: StringsModule;
    semver?: typeof import("@seedcli/semver");
    packageManager?: PackageManagerModule;
    config?: ConfigModule;
    patching?: PatchingModule;
    meta: {
        version: string;
        commandName: string;
        brand: string;
    };
}
//# sourceMappingURL=toolbox.d.ts.map