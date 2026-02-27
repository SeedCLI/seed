import { readFileSync } from "node:fs";
import { stat as fsStat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompletionInfo } from "@seedcli/completions";
import { renderCommandHelp, renderGlobalHelp } from "../command/help.js";
import { ParseError, parse } from "../command/parser.js";
import { route } from "../command/router.js";
import { discover } from "../discovery/auto-discover.js";
import { ExtensionSetupError, PluginValidationError } from "../plugin/errors.js";
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
	private initPromise: Promise<void> | null = null;
	private moduleCache = new Map<string, unknown>();
	// Snapshots of initial arrays to prevent duplication on retry
	private readonly initialCommands: Command[];
	private readonly initialExtensions: ExtensionConfig[];
	private readonly initialPlugins: Array<string | import("../types/plugin.js").PluginConfig>;

	constructor(config: BuilderConfig) {
		this.config = config;
		this.initialCommands = [...config.commands];
		this.initialExtensions = [...config.extensions];
		this.initialPlugins = [...config.plugins];
	}

	async run(argv?: string[]): Promise<void> {
		let raw = argv ?? process.argv.slice(2);

		// ─── Strip --debug/--verbose from argv if debug mode enabled ───
		if (this.config.debugEnabled) {
			const dashDashIdx = raw.indexOf("--");
			raw = raw.filter((a, i) => {
				if (dashDashIdx !== -1 && i > dashDashIdx) return true; // keep tokens after --
				return a !== "--debug" && a !== "--verbose";
			});
		}

		// ─── Graceful shutdown handling ───
		const cleanup = () => {
			// Reset cursor visibility in case a spinner hid it
			process.stdout.write("\x1B[?25h");
			process.exit(130);
		};
		process.once("SIGINT", cleanup);
		process.once("SIGTERM", cleanup);

		try {
			// ─── Auto-detect version from package.json if not explicitly set ───
			if (!this.config.version && this.config.srcDir) {
				this.config.version = await this.detectVersion(this.config.srcDir);
			}

			// ─── Handle --version ───
			if (
				this.config.versionEnabled &&
				raw.length === 1 &&
				(raw[0] === "--version" || raw[0] === "-v")
			) {
				const version = this.config.version ?? "0.0.0";
				console.log(`${this.config.brand} v${version}`);
				return;
			}

			// ─── Handle --help (global or command-specific) ───
			if (this.config.helpEnabled && raw.length === 0) {
				await this.initPlugins();
				this.printGlobalHelp();
				return;
			}

			if (this.config.helpEnabled && (raw.includes("--help") || raw.includes("-h"))) {
				const withoutHelp = raw.filter((a) => a !== "--help" && a !== "-h");
				if (withoutHelp.length === 0) {
					await this.initPlugins();
					this.printGlobalHelp();
					return;
				}
				// Try to route to show command-specific help
				await this.initPlugins();
				const helpResult = route(withoutHelp, this.config.commands);
				if (helpResult.command) {
					const helpText = renderCommandHelp(helpResult.command, {
						brand: this.config.brand,
						...this.config.helpOptions,
					});
					console.log(helpText);
				} else {
					this.printGlobalHelp();
				}
				return;
			}

			// ─── Initialize plugins ───
			await this.initPlugins();

			// ─── Route to command ───
			const result = route(raw, this.config.commands);

			if (!result.command) {
				// Try default command
				if (this.config.defaultCommand) {
					await this.executeCommand(this.config.defaultCommand, raw, raw);
					return;
				}

				// No match — show suggestions or help
				if (result.suggestions.length > 0) {
					const suggestions = result.suggestions
						.map((s) => `  ${s.name}    ${s.description ?? ""}`)
						.join("\n");
					if (result.matchedPath && result.matchedPath.length > 0) {
						// Subcommand failed after matching a parent command
						const parentPath = `${this.config.brand} ${result.matchedPath.join(" ")}`;
						const failedToken = result.argv[0];
						console.error(
							`Subcommand "${failedToken}" not found for "${parentPath}".\n\nDid you mean?\n${suggestions}\n\nRun \`${parentPath} --help\` for a list of available subcommands.`,
						);
					} else {
						console.error(
							`Command "${raw[0]}" not found.\n\nDid you mean?\n${suggestions}\n\nRun \`${this.config.brand} --help\` for a list of available commands.`,
						);
					}
				} else if (this.config.helpEnabled) {
					this.printGlobalHelp();
				} else {
					console.error(`Command "${raw[0]}" not found.`);
				}
				process.exitCode = 1;
				return;
			}

			// ─── Handle per-command --help ───
			if (
				this.config.helpEnabled &&
				(result.argv.includes("--help") || result.argv.includes("-h"))
			) {
				const helpText = renderCommandHelp(result.command, {
					brand: this.config.brand,
					...this.config.helpOptions,
				});
				console.log(helpText);
				return;
			}

			// ─── Execute command ───
			await this.executeCommand(result.command, result.argv, raw);
		} catch (err) {
			await this.handleError(err, raw);
		} finally {
			process.removeListener("SIGINT", cleanup);
			process.removeListener("SIGTERM", cleanup);
		}
	}

	private initPlugins(): Promise<void> {
		if (!this.initPromise) {
			this.initPromise = this.doInitPlugins().catch((err) => {
				// Clear cached promise so subsequent calls can retry
				this.initPromise = null;
				throw err;
			});
		}
		return this.initPromise;
	}

	private async doInitPlugins(): Promise<void> {
		// Reset to initial snapshot to prevent duplicates on retry
		this.config.commands = [...this.initialCommands];
		this.config.extensions = [...this.initialExtensions];
		this.config.plugins = [...this.initialPlugins];
		this.registry = new PluginRegistry();

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
		// Use the @seedcli/core package version (framework version), not the app version
		const frameworkVersion = await this.getFrameworkVersion();
		for (const plugin of loaded) {
			validateSeedcliVersion(plugin, frameworkVersion);
		}

		// Register each plugin (validates on register, deduplicates, checks conflicts)
		for (const plugin of loaded) {
			this.registry.register(plugin);
		}

		// Validate peer dependencies across all plugins
		this.registry.validateAll();

		// Merge plugin commands into config (checking for host command conflicts)
		const pluginCommands = this.registry.commands();
		for (const pluginCmd of pluginCommands) {
			const pluginNames = [pluginCmd.name, ...(pluginCmd.alias ?? [])];
			const conflict = this.config.commands.find((hostCmd) => {
				const hostNames = [hostCmd.name, ...(hostCmd.alias ?? [])];
				return pluginNames.some((n) => hostNames.includes(n));
			});
			if (conflict) {
				const pluginName = this.registry.findPluginByCommand(pluginCmd.name);
				throw new PluginValidationError(
					`Command name conflict: Plugin "${pluginName}" defines a command "${pluginCmd.name}" that conflicts with an existing command. Rename the command or use an alias to resolve the conflict.`,
					pluginName ?? "unknown",
				);
			}
		}
		this.config.commands.push(...pluginCommands);

		// Merge plugin extensions into config (checking for host extension conflicts)
		const pluginExtensions = this.registry.extensions();
		for (const pluginExt of pluginExtensions) {
			const conflict = this.config.extensions.find((hostExt) => hostExt.name === pluginExt.name);
			if (conflict) {
				const pluginName = this.registry.findPluginByExtension(pluginExt.name);
				throw new PluginValidationError(
					`Extension name conflict: Plugin "${pluginName}" defines an extension "${pluginExt.name}" that conflicts with an existing extension. Rename the extension to resolve the conflict.`,
					pluginName ?? "unknown",
				);
			}
		}
		this.config.extensions.push(...pluginExtensions);

		// Inject completions command if enabled
		if (this.config.completionsEnabled) {
			this.config.commands.push(this.createCompletionsCommand());
		}
	}

	private async scanPluginDir(dir: string, matching?: string): Promise<string[]> {
		const { readdir } = await import("node:fs/promises");

		const resolvedDir = resolve(dir);
		const entries = await readdir(resolvedDir, { withFileTypes: true }).catch(
			(err: NodeJS.ErrnoException) => {
				if (err.code === "ENOENT") return [];
				throw err;
			},
		);
		const pluginPaths: string[] = [];
		// Compile glob once outside the loop instead of per entry
		const glob = matching ? new Bun.Glob(matching) : undefined;

		for (const entry of entries) {
			if (typeof entry === "string") continue;

			if (!entry.isDirectory()) {
				// Check if it's a symlink to a directory (e.g. from `bun link`)
				if (entry.isSymbolicLink()) {
					try {
						const resolved = await fsStat(join(resolvedDir, entry.name));
						if (!resolved.isDirectory()) continue;
					} catch {
						continue;
					}
				} else {
					continue;
				}
			}

			if (glob && !glob.match(entry.name)) continue;

			pluginPaths.push(resolve(resolvedDir, entry.name));
		}

		return pluginPaths;
	}

	private async executeCommand(
		cmd: (typeof this.config.commands)[0],
		argv: string[],
		rawArgv?: string[],
	): Promise<void> {
		// Parse args and flags
		const parsed = parse(argv, cmd);

		// Assemble toolbox
		const toolbox = await this.assembleToolbox(
			parsed.args,
			parsed.flags,
			cmd.name,
			rawArgv,
			parsed.argv,
		);

		// Run onReady
		if (this.config.onReady) {
			await this.config.onReady(toolbox as Toolbox);
		}

		// ─── Run extension setup (topological order) ───
		const allExtensions = [...this.config.extensions];
		const sorted = allExtensions.length > 0 ? topoSort(allExtensions) : [];
		const setupCompleted: ExtensionConfig[] = [];

		try {
			for (const ext of sorted) {
				await this.runExtensionSetup(ext, toolbox);
				setupCompleted.push(ext);
			}

			// Build middleware chain
			const allMiddleware = [...this.config.middleware, ...(cmd.middleware ?? [])];

			if (allMiddleware.length > 0) {
				await this.runMiddleware(allMiddleware, toolbox, async () => {
					if (cmd.run) {
						await cmd.run(toolbox);
					} else if (cmd.subcommands && cmd.subcommands.length > 0 && this.config.helpEnabled) {
						// Container command with no run handler — show help
						const helpText = renderCommandHelp(cmd, {
							brand: this.config.brand,
							...this.config.helpOptions,
						});
						console.log(helpText);
					}
				});
			} else if (cmd.run) {
				await cmd.run(toolbox);
			} else if (cmd.subcommands && cmd.subcommands.length > 0 && this.config.helpEnabled) {
				// Container command with no run handler — show help
				const helpText = renderCommandHelp(cmd, {
					brand: this.config.brand,
					...this.config.helpOptions,
				});
				console.log(helpText);
			}
		} finally {
			// ─── Run extension teardown (reverse order) ───
			for (const ext of [...setupCompleted].reverse()) {
				if (ext.teardown) {
					try {
						await ext.teardown(toolbox);
					} catch (err) {
						// Log teardown errors but don't throw — ensure all teardowns run
						console.warn(
							`[seedcli] Extension "${ext.name}" teardown failed: ${err instanceof Error ? err.message : String(err)}`,
						);
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
		let timer: ReturnType<typeof setTimeout> | undefined;
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
		} catch (err) {
			if (err instanceof ExtensionSetupError) {
				throw err;
			}
			throw new ExtensionSetupError(
				`Extension "${ext.name}" setup failed: ${err instanceof Error ? err.message : String(err)}`,
				ext.name,
				{ cause: err },
			);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}

	private async runMiddleware(
		middleware: typeof this.config.middleware,
		toolbox: Toolbox<Record<string, unknown>, Record<string, unknown>>,
		final: () => Promise<void>,
	): Promise<void> {
		let index = 0;
		let finalCalled = false;

		const next = async (): Promise<void> => {
			if (index < middleware.length) {
				const fn = middleware[index++];
				await fn(toolbox, next);
			} else if (!finalCalled) {
				finalCalled = true;
				await final();
			}
		};

		await next();
	}

	private async assembleToolbox(
		args: Record<string, unknown>,
		flags: Record<string, unknown>,
		commandName: string,
		rawArgv?: string[],
		positionals?: string[],
	): Promise<Toolbox<Record<string, unknown>, Record<string, unknown>>> {
		const excluded = new Set(this.config.excludeModules ?? []);

		const raw = rawArgv ?? process.argv.slice(2);
		const isDebug =
			this.config.debugEnabled &&
			(raw.includes("--debug") || raw.includes("--verbose") || process.env.DEBUG === "1");

		const toolbox = {
			args,
			flags,
			parameters: {
				raw,
				argv: positionals ?? [],
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

		// Separate excluded modules (sync) from loadable modules (potentially async)
		const loadableModules: Array<[string, string, string?]> = [];
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
				// Check instance cache first (sync fast path)
				const cacheKey = `${pkg}:${namedExport ?? ""}`;
				if (this.moduleCache.has(cacheKey)) {
					(toolbox as unknown as Record<string, unknown>)[name] = this.moduleCache.get(cacheKey);
				} else {
					loadableModules.push([name, pkg, namedExport]);
				}
			}
		}

		// Load uncached modules in parallel for faster cold starts
		if (loadableModules.length > 0) {
			const results = await Promise.allSettled(
				loadableModules.map(async ([, pkg]) => {
					const registered = moduleRegistry.get(pkg);
					return registered ?? (await import(pkg));
				}),
			);

			for (let i = 0; i < loadableModules.length; i++) {
				const [name, pkg, namedExport] = loadableModules[i];
				const result = results[i];
				if (result.status === "fulfilled") {
					const mod = result.value;
					const resolved = namedExport ? mod[namedExport] : mod;
					const cacheKey = `${pkg}:${namedExport ?? ""}`;
					this.moduleCache.set(cacheKey, resolved);
					(toolbox as unknown as Record<string, unknown>)[name] = resolved;
				} else {
					// Module not installed — skip silently
					// But warn about unexpected errors (not MODULE_NOT_FOUND)
					const err = result.reason;
					const isModuleNotFound =
						err instanceof Error &&
						("code" in err ? (err as { code: string }).code === "ERR_MODULE_NOT_FOUND" : false);
					if (!isModuleNotFound && isDebug) {
						console.warn(
							`[seedcli] Failed to load ${pkg}: ${err instanceof Error ? err.message : String(err)}`,
						);
					}
				}
			}
		}

		// Enable debug logging on the print module when debug mode is active
		if (isDebug && !excluded.has("print")) {
			try {
				const printPkg = (moduleRegistry.get("@seedcli/print") ??
					(await import("@seedcli/print"))) as Record<string, unknown>;
				if (typeof printPkg.setDebugMode === "function") {
					(printPkg.setDebugMode as (enabled: boolean) => void)(true);
				}
			} catch {
				// Print module not installed — skip
			}
		}

		return toolbox;
	}

	private extractCompletionInfo(): CompletionInfo {
		return {
			brand: this.config.brand,
			commands: this.config.commands
				.filter((c) => c.name !== "completions" && !c.hidden)
				.map((cmd) => this.mapCommandToCompletionInfo(cmd)),
		};
	}

	/**
	 * Recursively map a Command to CompletionCommand, preserving
	 * arbitrarily nested subcommands for shell completion scripts.
	 */
	private mapCommandToCompletionInfo(
		cmd: Command,
	): import("@seedcli/completions").CompletionCommand {
		return {
			name: cmd.name,
			description: cmd.description,
			aliases: cmd.alias,
			subcommands: cmd.subcommands
				?.filter((sub) => !sub.hidden)
				.map((sub) => this.mapCommandToCompletionInfo(sub)),
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

	private cachedFrameworkVersion: string | null = null;

	private async getFrameworkVersion(): Promise<string> {
		if (this.cachedFrameworkVersion !== null) return this.cachedFrameworkVersion;
		try {
			const coreDir = dirname(fileURLToPath(import.meta.url));
			// Walk up from src/runtime/ to find package.json
			let dir = coreDir;
			for (let i = 0; i < 5; i++) {
				try {
					const pkgPath = join(dir, "package.json");
					const data = JSON.parse(readFileSync(pkgPath, "utf-8"));
					if (data.name === "@seedcli/core" && data.version) {
						this.cachedFrameworkVersion = data.version;
						return data.version;
					}
				} catch {
					// Not found, try parent
				}
				const parent = dirname(dir);
				if (parent === dir) break;
				dir = parent;
			}
		} catch {
			// Fallback if import.meta.url resolution fails (e.g., compiled binary)
		}
		this.cachedFrameworkVersion = "0.0.0";
		return "0.0.0";
	}

	private async detectVersion(srcDir: string): Promise<string | undefined> {
		// Walk up from srcDir looking for package.json (srcDir is typically ./src)
		let dir = srcDir;
		for (let i = 0; i < 3; i++) {
			try {
				const pkgPath = join(dir, "package.json");
				const data = JSON.parse(readFileSync(pkgPath, "utf-8"));
				if (data.version) return data.version;
			} catch {
				// Not found, try parent
			}
			const parent = dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}
		return undefined;
	}

	private printGlobalHelp(): void {
		const helpText = renderGlobalHelp(this.config.commands, {
			brand: this.config.brand,
			version: this.config.version,
			versionEnabled: this.config.versionEnabled,
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

		const error = err instanceof Error ? err : new Error(String(err), { cause: err });

		if (this.config.onError) {
			try {
				const commandName = raw?.[0] ?? "";
				const toolbox = await this.assembleToolbox({}, {}, commandName, raw);
				await this.config.onError(error, toolbox as Toolbox);
				// Set exitCode if onError handler didn't explicitly set one
				if (process.exitCode === undefined || process.exitCode === 0) {
					process.exitCode = 1;
				}
			} catch (handlerErr) {
				// Prevent infinite loop if onError itself throws
				console.error(`ERROR: ${error.message}`);
				console.error(
					`Additionally, the error handler threw: ${handlerErr instanceof Error ? handlerErr.message : String(handlerErr)}`,
				);
				process.exitCode = 1;
			}
		} else {
			console.error(`ERROR: ${error.message}`);
			process.exitCode = 1;
		}
	}
}
