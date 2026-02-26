export declare class PluginError extends Error {
    readonly pluginName: string;
    constructor(message: string, pluginName: string);
}
export declare class PluginValidationError extends PluginError {
    constructor(message: string, pluginName: string);
}
export declare class PluginLoadError extends PluginError {
    constructor(message: string, pluginName: string);
}
export declare class PluginDependencyError extends PluginError {
    readonly dependency: string;
    constructor(message: string, pluginName: string, dependency: string);
}
export declare class ExtensionCycleError extends Error {
    readonly extensions: string[];
    constructor(extensions: string[]);
}
export declare class ExtensionSetupError extends Error {
    readonly extensionName: string;
    constructor(message: string, extensionName: string);
}
//# sourceMappingURL=errors.d.ts.map