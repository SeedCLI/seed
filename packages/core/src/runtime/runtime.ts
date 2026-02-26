import type { CompletionInfo } from "@seedcli/completions";
import { renderCommandHelp, renderGlobalHelp } from "../command/help.js";
import { ParseError, parse } from "../command/parser.js";
import { route } from "../command/router.js";
import { discover } from "../discovery/auto-discover.js";
import { ExtensionSetupError } from "../plugin/errors.js";
import { loadPlugins } from "../plugin/loader.js";
import { PluginRegistry } from "../plugin/registry.js";
import { topoSort } from "../plugin/topo-sort.js";
import { validateSeedcliVersion } from "../plugin/validator.js";
import type { Command } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
import type { Toolbox } from "../types/toolbox.js";
import type { BuilderConfig } from "./builder.js";

/**
 * Quick-start config for the `run()` convenience function.
 */
export interface RunConfig {
	name: string;
	version?: string;
	commands: Command[];
	defaultCommand?: Command;
}

/**
 * Quick-start function for simple CLIs without the builder pattern.
 *
 * ```ts
 * import { run } from "@seedcli/core";
 *
 * await run({
 *   name: "mycli",
 *   version: "1.0.0",
 *   commands: [hello, deploy],
 * });
 * ```
 */
export async function run(config: RunConfig): Promise<void> {
	const { build } = await import("./builder.js");
	const builder = build(config.name).commands(config.commands).help().version(config.version);

	if (config.defaultCommand) {
		builder.defaultCommand(config.defaultCommand);
	}

	const runtime = builder.create();
	await runtime.run();
}

const DEFAULT_SETUP_TIMEOUT = 10_000;

/**
 * The CLI runtime — executes the full lifecycle:
 * 1. Load and validate plugins
 * 2. Parse argv
 * 3. Route to command
 * 4. Run extensions setup (topological order)
 * 5. Execute middleware chain
 * 6. Run command handler
 * 7. Run extensions teardown (reverse order)
 */
/**
 * Pre-register modules so compiled binaries can resolve them
 * without dynamic `await import()`. Called by the generated build entry.
 *
 * ```ts
 * import * as print from "@seedcli/print";
 * registerModule("@seedcli/print", print);
 * ```
 */
const moduleRegistry = new Map<string, unknown>();

export function registerModule(name: string, mod: unknown): void {
	moduleRegistry.set(name, mod);
}

export class Runtime {
	private config: BuilderConfig;
	private registry = new PluginRegistry();
	private initialized = false;
	private moduleCache = new Map<string, unknown>();

	constructor(config: BuilderConfig) {
		this.config = config;
	}

	async run(argv?: string[]): Promise<void> {
		let raw = argv ?? process.argv.slice(2);

		// ─── Strip --debug/--verbose from argv if debug mode enabled ───
		if (this.config.debugEnabled) {
			raw = raw.filter((a) => a !== "--debug" && a !== "--verbose");
		}

		// ─── Graceful shutdown handling ───
		const cleanup = () => {
			// Reset cursor visibility in case a spinner hid it
			process.stdout.write("\x1B[?25h");
			process.exit(130);
		};
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		try {
			// ─── Handle --version ───
			if (this.config.versionEnabled && (raw.includes("--version") || raw.includes("-v"))) {
				const version = this.config.version ?? "0.0.0";
				console.log(`${this.config.brand} v${version}`);
				return;
			}

			// ─── Handle --help (global) ───
			if (this.config.helpEnabled && raw.length === 0) {
				await this.initPlugins();
				this.printGlobalHelp();
				return;
			}

			if (
				this.config.helpEnabled &&
				(raw.includes("--help") || raw.includes("-h")) &&
				raw.length === 1
			) {
				await this.initPlugins();
				this.printGlobalHelp();
				return;
			}

			// ─── Initialize plugins ───
			await this.initPlugins();

			// ─── Route to command ───
			const result = route(raw, this.config.commands);

			if (!result.command) {
				// Try default command
				if (this.config.defaultCommand) {
					await this.executeCommand(this.config.defaultCommand, raw);
					return;
				}

				// No match — show suggestions or help
				if (result.suggestions.length > 0) {
					const suggestions = result.suggestions
						.map((s) => `  ${s.name}    ${s.description ?? ""}`)
						.join("\n");
					console.error(
						`Command "${raw[0]}" not found.\n\nDid you mean?\n${suggestions}\n\nRun \`${this.config.brand} --help\` for a list of available commands.`,
					);
				} else if (this.config.helpEnabled) {
					this.printGlobalHelp();
				} else {
					console.error(`Command "${raw[0]}" not found.`);
				}
				process.exitCode = 1;
				return;
			}

			// ─── Handle per-command --help ───
			if (this.config.helpEnabled && (result.argv.includes("--help") || result.argv.includes("-h"))) {
				const helpText = renderCommandHelp(result.command, {
					brand: this.config.brand,
					...this.config.helpOptions,
				});
				console.log(helpText);
				return;
			}

			// ─── Execute command ───
			await this.executeCommand(result.command, result.argv);
		} catch (err) {
			await this.handleError(err, raw);
		} finally {
			process.removeListener("SIGINT", cleanup);
			process.removeListener("SIGTERM", cleanup);
		}
	}

	private async initPlugins(): Promise<void> {
		if (this.initialized) return;
		this.initialized = true;

		// ─── Auto-discovery ───
		if (this.config.srcDir) {
			const discovered = await discover(this.config.srcDir);
			this.config.commands.push(...discovered.commands);
			this.config.extensions.push(...discovered.extensions);
		}

		// ─── Scan plugin directories ───
		for (const { dir, options } of this.config.pluginDirs) {
			const scanned = await this.scanPluginDir(dir, options?.matching);
			this.config.plugins.push(...scanned);
		}

		if (this.config.plugins.length === 0) {
			// Still inject completions even without plugins
			if (this.config.completionsEnabled) {
				this.config.commands.push(this.createCompletionsCommand());
			}
			return;
		}

		// Load all plugin configs (dynamic imports for string sources)
		const loaded = await loadPlugins(this.config.plugins);

		// Validate seedcli version compatibility
		const runtimeVersion = this.config.version ?? "0.0.0";
		for (const plugin of loaded) {
			validateSeedcliVersion(plugin, runtimeVersion);
		}

		// Register each plugin (validates on register, deduplicates, checks conflicts)
		for (const plugin of loaded) {
			this.registry.register(plugin);
		}

		// Validate peer dependencies across all plugins
		this.registry.validateAll();

		// Merge plugin commands into config
		const pluginCommands = this.registry.commands();
		this.config.commands.push(...pluginCommands);

		// Merge plugin extensions into config
		const pluginExtensions = this.registry.extensions();
		this.config.extensions.push(...pluginExtensions);

		// Inject completions command if enabled
		if (this.config.completionsEnabled) {
			this.config.commands.push(this.createCompletionsCommand());
		}
	}

	private async scanPluginDir(dir: string, matching?: string): Promise<string[]> {
		const { resolve } = await import("node:path");
		const { readdir } = await import("node:fs/promises");

		const resolvedDir = resolve(dir);
		const entries = await readdir(resolvedDir, { withFileTypes: true });
		const pluginPaths: string[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			if (matching) {
				const glob = new Bun.Glob(matching);
				if (!glob.match(entry.name)) continue;
			}

			pluginPaths.push(resolve(resolvedDir, entry.name));
		}

		return pluginPaths;
	}

	private async executeCommand(
		cmd: (typeof this.config.commands)[0],
		argv: string[],
	): Promise<void> {
		// Parse args and flags
		const parsed = parse(argv, cmd);

		// Assemble toolbox
		const toolbox = await this.assembleToolbox(parsed.args, parsed.flags, cmd.name);

		// Run onReady
		if (this.config.onReady) {
			await this.config.onReady(toolbox);
		}

		// ─── Run extension setup (topological order) ───
		const allExtensions = [...this.config.extensions];
		const sorted = allExtensions.length > 0 ? topoSort(allExtensions) : [];
		const setupCompleted: ExtensionConfig[] = [];

		for (const ext of sorted) {
			await this.runExtensionSetup(ext, toolbox);
			setupCompleted.push(ext);
		}

		try {
			// Build middleware chain
			const allMiddleware = [...this.config.middleware, ...(cmd.middleware ?? [])];

			if (allMiddleware.length > 0) {
				await this.runMiddleware(allMiddleware, toolbox, async () => {
					if (cmd.run) {
						await cmd.run(toolbox);
					}
				});
			} else if (cmd.run) {
				await cmd.run(toolbox);
			}
		} finally {
			// ─── Run extension teardown (reverse order) ───
			for (const ext of [...setupCompleted].reverse()) {
				if (ext.teardown) {
					try {
						await ext.teardown(toolbox);
					} catch {
						// Teardown errors are swallowed to ensure all teardowns run
					}
				}
			}
		}
	}

	private async runExtensionSetup(
		ext: ExtensionConfig,
		toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
	): Promise<void> {
		const timeout = DEFAULT_SETUP_TIMEOUT;

		const setupPromise = Promise.resolve(ext.setup(toolbox));
		let timer: ReturnType<typeof setTimeout>;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				reject(
					new ExtensionSetupError(
						`Extension "${ext.name}" setup timed out after ${timeout}ms`,
						ext.name,
					),
				);
			}, timeout);
		});

		try {
			await Promise.race([setupPromise, timeoutPromise]);
		} finally {
			clearTimeout(timer!);
		}
	}

	private async runMiddleware(
		middleware: typeof this.config.middleware,
		toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
		final: () => Promise<void>,
	): Promise<void> {
		let index = 0;

		const next = async (): Promise<void> => {
			if (index < middleware.length) {
				const fn = middleware[index++];
				await fn(toolbox, next);
			} else {
				await final();
			}
		};

		await next();
	}

	private async assembleToolbox(
		args: Record<string, unknown>,
		flags: Record<string, unknown>,
		commandName: string,
	): Promise<Toolbox<Record<string, unknown>, Record<string, unknown>>> {
		const excluded = new Set(this.config.excludeModules ?? []);

		const rawArgv = process.argv.slice(2);
		const isDebug = this.config.debugEnabled &&
			(rawArgv.includes("--debug") || rawArgv.includes("--verbose") || process.env.DEBUG === "1");

		const toolbox = {
			args,
			flags,
			parameters: {
				raw: rawArgv,
				argv: Object.values(args).map(String),
				command: commandName,
			},
			meta: {
				version: this.config.version ?? "0.0.0",
				commandName,
				brand: this.config.brand,
				debug: isDebug,
			},
		} as Toolbox<Record<string, unknown>, Record<string, unknown>>;

		// [toolbox key, package name, named export to extract]
		// When a named export is specified, that export is used instead of the
		// full module namespace. This is needed when the module's namespace
		// contains raw functions whose signatures differ from the toolbox
		// interface (e.g. @seedcli/print exports table() returning string,
		// but PrintModule.table() returns void because it logs automatically).
		const modules: Array<[string, string, string?]> = [
			["print", "@seedcli/print", "print"],
			["prompt", "@seedcli/prompt"],
			["filesystem", "@seedcli/filesystem"],
			["system", "@seedcli/system"],
			["http", "@seedcli/http"],
			["template", "@seedcli/template"],
			["strings", "@seedcli/strings"],
			["semver", "@seedcli/semver"],
			["packageManager", "@seedcli/package-manager"],
			["config", "@seedcli/config"],
			["patching", "@seedcli/patching"],
		];

		for (const [name, pkg, namedExport] of modules) {
			if (excluded.has(name)) {
				Object.defineProperty(toolbox, name, {
					get: () => {
						throw new Error(
							`The "${name}" module was excluded from this CLI. To use it, remove "${name}" from the .exclude() call in your CLI builder.`,
						);
					},
					enumerable: true,
					configurable: true,
				});
			} else {
				// Check instance cache first, then registry, then dynamic import
				const cacheKey = `${pkg}:${namedExport ?? ""}`;
				if (this.moduleCache.has(cacheKey)) {
					(toolbox as unknown as Record<string, unknown>)[name] = this.moduleCache.get(cacheKey);
				} else {
					try {
						const registered = moduleRegistry.get(pkg);
						const mod = registered ?? (await import(pkg));
						const resolved = namedExport ? mod[namedExport] : mod;
						this.moduleCache.set(cacheKey, resolved);
						(toolbox as unknown as Record<string, unknown>)[name] = resolved;
					} catch {
						// Module not installed — skip silently
					}
				}
			}
		}

		return toolbox;
	}

	private extractCompletionInfo(): CompletionInfo {
		return {
			brand: this.config.brand,
			commands: this.config.commands
				.filter((c) => c.name !== "completions" && !c.hidden)
				.map((cmd) => ({
					name: cmd.name,
					description: cmd.description,
					aliases: cmd.alias,
					subcommands: cmd.subcommands?.map((sub) => ({
						name: sub.name,
						description: sub.description,
						flags: sub.flags
							? Object.entries(sub.flags).map(([name, def]) => ({
									name,
									alias: def.alias,
									description: def.description,
									type: def.type,
									choices: def.choices,
								}))
							: undefined,
					})),
					flags: cmd.flags
						? Object.entries(cmd.flags).map(([name, def]) => ({
								name,
								alias: def.alias,
								description: def.description,
								type: def.type,
								choices: def.choices,
							}))
						: undefined,
					args: cmd.args
						? Object.entries(cmd.args).map(([name, def]) => ({
								name,
								description: def.description,
								choices: def.choices,
							}))
						: undefined,
				})),
		};
	}

	private createCompletionsCommand(): Command {
		return {
			name: "completions",
			description: "Generate shell completion scripts",
			subcommands: [
				{
					name: "install",
					description: "Auto-detect shell and install completions",
					run: async () => {
						const { install } = await import("@seedcli/completions");
						const info = this.extractCompletionInfo();
						const result = await install(info);
						console.log(`Installed ${result.shell} completions to ${result.path}`);
					},
				},
				{
					name: "bash",
					description: "Print bash completion script",
					run: async () => {
						const { bash } = await import("@seedcli/completions");
						console.log(bash(this.extractCompletionInfo()));
					},
				},
				{
					name: "zsh",
					description: "Print zsh completion script",
					run: async () => {
						const { zsh } = await import("@seedcli/completions");
						console.log(zsh(this.extractCompletionInfo()));
					},
				},
				{
					name: "fish",
					description: "Print fish completion script",
					run: async () => {
						const { fish } = await import("@seedcli/completions");
						console.log(fish(this.extractCompletionInfo()));
					},
				},
				{
					name: "powershell",
					description: "Print PowerShell completion script",
					run: async () => {
						const { powershell } = await import("@seedcli/completions");
						console.log(powershell(this.extractCompletionInfo()));
					},
				},
			],
		};
	}

	private printGlobalHelp(): void {
		const helpText = renderGlobalHelp(this.config.commands, {
			brand: this.config.brand,
			version: this.config.version,
			...this.config.helpOptions,
		});
		console.log(helpText);
	}

	private async handleError(err: unknown, raw?: string[]): Promise<void> {
		if (err instanceof ParseError) {
			console.error(`ERROR: ${err.message}`);
			process.exitCode = 1;
			return;
		}

		const error = err instanceof Error ? err : new Error(String(err));

		if (this.config.onError) {
			const commandName = raw?.[0] ?? "";
			const toolbox = await this.assembleToolbox({}, {}, commandName);
			await this.config.onError(error, toolbox);
		} else {
			console.error(`ERROR: ${error.message}`);
			process.exitCode = 1;
		}
	}
}
