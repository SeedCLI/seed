import type { Command } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";
import type { PluginConfig } from "../types/plugin.js";
import { PluginValidationError } from "./errors.js";
import { validatePeerDependencies, validatePlugin } from "./validator.js";

/**
 * In-memory registry for loaded and validated plugins.
 */
export class PluginRegistry {
	private plugins = new Map<string, PluginConfig>();

	/**
	 * Register a plugin after validation.
	 * Silently deduplicates if a plugin with the same name is already registered.
	 * Validates command and extension name conflicts across all plugins.
	 */
	register(plugin: PluginConfig): void {
		const validated = validatePlugin(plugin);

		// Edge case #11: Duplicate plugin → deduplicate with version conflict warning
		if (this.plugins.has(validated.name)) {
			const existing = this.plugins.get(validated.name)!;
			if (existing.version !== validated.version) {
				console.warn(
					`[seedcli] Warning: Plugin "${validated.name}" is registered multiple times with different versions (${existing.version} vs ${validated.version}). Using the first loaded version (${existing.version}).`,
				);
			}
			return;
		}

		// Edge case #1: Command name/alias conflicts
		if (validated.commands) {
			const existingCommands = this.commands();
			for (const cmd of validated.commands) {
				// Collect all names/aliases for the new command
				const newNames = [cmd.name, ...(cmd.alias ?? [])];
				const conflicting = existingCommands.find((existing) => {
					const existingNames = [existing.name, ...(existing.alias ?? [])];
					return newNames.some((n) => existingNames.includes(n));
				});
				if (conflicting) {
					const conflictPlugin = this.findPluginByCommand(conflicting.name);
					throw new PluginValidationError(
						`Command name conflict: Both "${conflictPlugin}" and "${validated.name}" define a command named "${cmd.name}". Rename one of the commands or use aliases to resolve the conflict.`,
						validated.name,
					);
				}
			}
		}

		// Edge case #2: Extension name conflicts
		if (validated.extensions) {
			const existingExtensions = this.extensions();
			for (const ext of validated.extensions) {
				const conflicting = existingExtensions.find((existing) => existing.name === ext.name);
				if (conflicting) {
					const conflictPlugin = this.findPluginByExtension(conflicting.name);
					throw new PluginValidationError(
						`Extension name conflict: Both "${conflictPlugin}" and "${validated.name}" register an extension named "${ext.name}". Each extension must have a unique name.`,
						validated.name,
					);
				}
			}
		}

		this.plugins.set(validated.name, validated);
	}

	/** Get a plugin by name. */
	get(name: string): PluginConfig | undefined {
		return this.plugins.get(name);
	}

	/** Check if a plugin is registered. */
	has(name: string): boolean {
		return this.plugins.has(name);
	}

	/** Get all registered plugins. */
	all(): PluginConfig[] {
		return [...this.plugins.values()];
	}

	/** Aggregate all commands from all registered plugins. */
	commands(): Command[] {
		const cmds: Command[] = [];
		for (const plugin of this.plugins.values()) {
			if (plugin.commands) {
				cmds.push(...plugin.commands);
			}
		}
		return cmds;
	}

	/** Aggregate all extensions from all registered plugins. */
	extensions(): ExtensionConfig[] {
		const exts: ExtensionConfig[] = [];
		for (const plugin of this.plugins.values()) {
			if (plugin.extensions) {
				exts.push(...plugin.extensions);
			}
		}
		return exts;
	}

	/** Validate peer dependencies across all registered plugins. */
	validateAll(): void {
		const errors: Error[] = [];
		for (const plugin of this.plugins.values()) {
			try {
				validatePeerDependencies(plugin, this.plugins);
			} catch (err) {
				errors.push(err instanceof Error ? err : new Error(String(err)));
			}
		}
		if (errors.length === 1) {
			throw errors[0];
		}
		if (errors.length > 1) {
			throw new PluginValidationError(
				`Multiple plugin validation errors:\n\n${errors.map((e) => e.message).join("\n\n")}`,
				"multiple",
			);
		}
	}

	/** Find which plugin registered a given command name. */
	findPluginByCommand(cmdName: string): string | undefined {
		for (const plugin of this.plugins.values()) {
			if (plugin.commands?.some((c) => c.name === cmdName)) {
				return plugin.name;
			}
		}
		return undefined;
	}

	/** Find which plugin registered a given extension name. */
	findPluginByExtension(extName: string): string | undefined {
		for (const plugin of this.plugins.values()) {
			if (plugin.extensions?.some((e) => e.name === extName)) {
				return plugin.name;
			}
		}
		return undefined;
	}
}
