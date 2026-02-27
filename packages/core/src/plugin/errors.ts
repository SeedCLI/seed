export class PluginError extends Error {
	readonly pluginName: string;
	constructor(message: string, pluginName: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "PluginError";
		this.pluginName = pluginName;
	}
}

export class PluginValidationError extends PluginError {
	constructor(message: string, pluginName: string, options?: ErrorOptions) {
		super(message, pluginName, options);
		this.name = "PluginValidationError";
	}
}

export class PluginLoadError extends PluginError {
	constructor(message: string, pluginName: string, options?: ErrorOptions) {
		super(message, pluginName, options);
		this.name = "PluginLoadError";
	}
}

export class PluginDependencyError extends PluginError {
	readonly dependency: string;
	constructor(message: string, pluginName: string, dependency: string, options?: ErrorOptions) {
		super(message, pluginName, options);
		this.name = "PluginDependencyError";
		this.dependency = dependency;
	}
}

export class ExtensionCycleError extends Error {
	readonly extensions: string[];
	constructor(extensions: string[], options?: ErrorOptions) {
		super(`Circular dependency detected among extensions: ${extensions.join(", ")}`, options);
		this.name = "ExtensionCycleError";
		this.extensions = extensions;
	}
}

export class ExtensionSetupError extends Error {
	readonly extensionName: string;
	constructor(message: string, extensionName: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ExtensionSetupError";
		this.extensionName = extensionName;
	}
}
