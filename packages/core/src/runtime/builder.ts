import type { HelpOptions } from "../command/help.js";
import type { Command, Middleware } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
import type { PluginConfig } from "../types/plugin.js";
import type { Seed } from "../types/seed.js";
import { Runtime } from "./runtime.js";

// ─── Builder Options ───

export interface PluginScanOptions {
	matching?: string;
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
	helpOptions?: HelpOptions;
	helpEnabled: boolean;
	versionEnabled: boolean;
	completionsEnabled: boolean;
	debugEnabled: boolean;
	onReady?: (seed: Seed) => Promise<void> | void;
	onError?: (error: Error, seed: Seed) => Promise<void> | void;
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
			helpEnabled: true,
			versionEnabled: true,
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

	/**
	 * Register a plugin by name or by imported module.
	 *
	 * **Recommended** — import the plugin for automatic type augmentation:
	 * ```ts
	 * import notaPlugin from "nota-plugin";
	 * build("mycli").plugin(notaPlugin);
	 * ```
	 *
	 * String-based (requires manual `import type {} from "plugin-name"` for types):
	 * ```ts
	 * build("mycli").plugin("nota-plugin");
	 * ```
	 */
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
		this.cfg.excludeModules = [...(this.cfg.excludeModules ?? []), ...modules];
		return this;
	}

	help(options?: HelpOptions): this {
		this.cfg.helpEnabled = true;
		this.cfg.helpOptions = options ? { ...options } : undefined;
		return this;
	}

	noHelp(): this {
		this.cfg.helpEnabled = false;
		return this;
	}

	version(version?: string): this {
		this.cfg.versionEnabled = true;
		if (version) {
			this.cfg.version = version;
		}
		return this;
	}

	noVersion(): this {
		this.cfg.versionEnabled = false;
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

	onReady(fn: (seed: Seed) => Promise<void> | void): this {
		this.cfg.onReady = fn;
		return this;
	}

	onError(fn: (error: Error, seed: Seed) => Promise<void> | void): this {
		this.cfg.onError = fn;
		return this;
	}

	create(): Runtime {
		return new Runtime({
			...this.cfg,
			commands: [...this.cfg.commands],
			middleware: [...this.cfg.middleware],
			extensions: [...this.cfg.extensions],
			plugins: [...this.cfg.plugins],
			pluginDirs: [...this.cfg.pluginDirs],
		});
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
