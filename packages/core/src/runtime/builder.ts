import type { HelpOptions } from "../command/help.js";
import type { Command, Middleware } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
import type { PluginConfig } from "../types/plugin.js";
import { Runtime } from "./runtime.js";

// ─── Builder Options ───

export interface PluginScanOptions {
	matching?: string;
}

export interface ConfigOptions {
	configName?: string;
	defaults?: Record<string, unknown>;
	cwd?: string;
}

export interface BuilderConfig {
	brand: string;
	version?: string;
	commands: Command[];
	defaultCommand?: Command;
	middleware: Middleware[];
	extensions: ExtensionConfig[];
	plugins: Array<string | PluginConfig>;
	pluginDirs: Array<{ dir: string; options?: PluginScanOptions }>;
	srcDir?: string;
	excludeModules?: string[];
	configOptions?: ConfigOptions;
	helpOptions?: HelpOptions;
	helpEnabled: boolean;
	versionEnabled: boolean;
	completionsEnabled: boolean;
	debugEnabled: boolean;
	onReady?: (toolbox: unknown) => Promise<void> | void;
	onError?: (error: Error, toolbox: unknown) => Promise<void> | void;
}

// ─── Builder ───

export class Builder {
	private cfg: BuilderConfig;

	constructor(brand: string) {
		this.cfg = {
			brand,
			commands: [],
			middleware: [],
			extensions: [],
			plugins: [],
			pluginDirs: [],
			helpEnabled: false,
			versionEnabled: false,
			completionsEnabled: false,
			debugEnabled: false,
		};
	}

	command(cmd: Command): this {
		this.cfg.commands.push(cmd);
		return this;
	}

	commands(cmds: Command[]): this {
		this.cfg.commands.push(...cmds);
		return this;
	}

	defaultCommand(cmd: Command): this {
		this.cfg.defaultCommand = cmd;
		return this;
	}

	middleware(fn: Middleware): this {
		this.cfg.middleware.push(fn);
		return this;
	}

	extension(ext: ExtensionConfig): this {
		this.cfg.extensions.push(ext);
		return this;
	}

	plugin(source: string | string[] | PluginConfig): this {
		if (Array.isArray(source)) {
			this.cfg.plugins.push(...source);
		} else {
			this.cfg.plugins.push(source);
		}
		return this;
	}

	plugins(dir: string, options?: PluginScanOptions): this {
		this.cfg.pluginDirs.push({ dir, options });
		return this;
	}

	src(dir: string): this {
		this.cfg.srcDir = dir;
		return this;
	}

	exclude(modules: string[]): this {
		this.cfg.excludeModules = modules;
		return this;
	}

	config(options?: ConfigOptions): this {
		this.cfg.configOptions = options;
		return this;
	}

	help(options?: HelpOptions): this {
		this.cfg.helpEnabled = true;
		this.cfg.helpOptions = options;
		return this;
	}

	version(version?: string): this {
		this.cfg.versionEnabled = true;
		if (version) {
			this.cfg.version = version;
		}
		return this;
	}

	completions(): this {
		this.cfg.completionsEnabled = true;
		return this;
	}

	debug(): this {
		this.cfg.debugEnabled = true;
		return this;
	}

	onReady(fn: (toolbox: unknown) => Promise<void> | void): this {
		this.cfg.onReady = fn;
		return this;
	}

	onError(fn: (error: Error, toolbox: unknown) => Promise<void> | void): this {
		this.cfg.onError = fn;
		return this;
	}

	create(): Runtime {
		return new Runtime(this.cfg);
	}
}

// ─── Public API ───

/**
 * Create a new CLI builder.
 *
 * ```ts
 * const cli = build("mycli")
 *   .command(helloCommand)
 *   .help()
 *   .version("1.0.0")
 *   .create();
 *
 * await cli.run();
 * ```
 */
export function build(brand: string): Builder {
	return new Builder(brand);
}
