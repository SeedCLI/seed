export class PluginError extends Error {
    pluginName;
    constructor(message, pluginName) {
        super(message);
        this.name = "PluginError";
        this.pluginName = pluginName;
    }
}
export class PluginValidationError extends PluginError {
    constructor(message, pluginName) {
        super(message, pluginName);
        this.name = "PluginValidationError";
    }
}
export class PluginLoadError extends PluginError {
    constructor(message, pluginName) {
        super(message, pluginName);
        this.name = "PluginLoadError";
    }
}
export class PluginDependencyError extends PluginError {
    dependency;
    constructor(message, pluginName, dependency) {
        super(message, pluginName);
        this.name = "PluginDependencyError";
        this.dependency = dependency;
    }
}
export class ExtensionCycleError extends Error {
    extensions;
    constructor(extensions) {
        super(`Circular dependency detected among extensions: ${extensions.join(", ")}`);
        this.name = "ExtensionCycleError";
        this.extensions = extensions;
    }
}
export class ExtensionSetupError extends Error {
    extensionName;
    constructor(message, extensionName) {
        super(message);
        this.name = "ExtensionSetupError";
        this.extensionName = extensionName;
    }
}
//# sourceMappingURL=errors.js.map