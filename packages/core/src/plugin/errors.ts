export class PluginError extends Error {
	readonly pluginName: string;
	constructor(message: string, pluginName: string) {
		super(message);
		this.name = "PluginError";
		this.pluginName = pluginName;
	}
}

export class PluginValidationError extends PluginError {
	constructor(message: string, pluginName: string) {
		super(message, pluginName);
		this.name = "PluginValidationError";
	}
}

export class PluginLoadError extends PluginError {
	constructor(message: string, pluginName: string) {
		super(message, pluginName);
		this.name = "PluginLoadError";
	}
}

export class PluginDependencyError extends PluginError {
	readonly dependency: string;
	constructor(message: string, pluginName: string, dependency: string) {
		super(message, pluginName);
		this.name = "PluginDependencyError";
		this.dependency = dependency;
	}
}

export class ExtensionCycleError extends Error {
	readonly extensions: string[];
	constructor(extensions: string[]) {
		super(`Circular dependency detected among extensions: ${extensions.join(", ")}`);
		this.name = "ExtensionCycleError";
		this.extensions = extensions;
	}
}

export class ExtensionSetupError extends Error {
	readonly extensionName: string;
	constructor(message: string, extensionName: string) {
		super(message);
		this.name = "ExtensionSetupError";
		this.extensionName = extensionName;
	}
}
