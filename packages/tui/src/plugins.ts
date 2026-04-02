/**
 * Plugin system for extending TUI apps with custom components,
 * keymaps, and render hooks.
 *
 * Provides namespaced component registration (`vendor/component`),
 * deterministic conflict detection, version compatibility checks,
 * and cleanup contracts.
 */

import type { EventHandler, TuiNode } from "@seedcli/tui-core";

// ─── Plugin Definition ───

export interface TuiPlugin {
	/** Unique plugin identifier (e.g. "my-org/dashboard-widgets"). */
	id: string;
	/** Human-readable name. */
	name: string;
	/** Plugin version (semver string). */
	version: string;
	/** Minimum compatible TUI API version. */
	minApiVersion?: string;
	/** Called when the plugin is installed into a registry. */
	install(registry: PluginRegistry): void;
	/** Called when the plugin is uninstalled. */
	dispose?(): void;
}

// ─── Component Factory ───

/** A component factory that produces a TuiNode tree from options. */
export type ComponentFactory<T = Record<string, unknown>> = (options: T) => TuiNode;

interface RegisteredComponent {
	pluginId: string;
	factory: ComponentFactory;
	version: string;
}

// ─── Keymap Extension ───

export interface KeymapBinding {
	key: string;
	modifiers?: Array<"ctrl" | "alt" | "shift" | "meta">;
	handler: EventHandler;
	description?: string;
}

interface RegisteredKeymap {
	pluginId: string;
	bindings: KeymapBinding[];
}

// ─── Render Hook ───

export type RenderHook = (root: TuiNode) => void;

interface RegisteredRenderHook {
	pluginId: string;
	phase: "before" | "after";
	hook: RenderHook;
}

// ─── Plugin Registry ───

/** Current TUI API version for compatibility checks. */
const TUI_API_VERSION = "1.0.0";

export class PluginRegistry {
	private plugins = new Map<string, TuiPlugin>();
	private components = new Map<string, RegisteredComponent>();
	private keymaps = new Map<string, RegisteredKeymap>();
	private renderHooks: RegisteredRenderHook[] = [];
	private _apiVersion = TUI_API_VERSION;

	get apiVersion(): string {
		return this._apiVersion;
	}

	/** Get all installed plugin IDs. */
	get installedPlugins(): string[] {
		return [...this.plugins.keys()];
	}

	/** Get all registered component names. */
	get registeredComponents(): string[] {
		return [...this.components.keys()];
	}

	/**
	 * Install a plugin.
	 * Checks for conflicts and version compatibility before installation.
	 */
	install(plugin: TuiPlugin): void {
		// Check if already installed
		if (this.plugins.has(plugin.id)) {
			throw new Error(
				`[SEED_TUI_PLUGIN_0001] Plugin "${plugin.id}" is already installed. ` +
					`Uninstall it first with registry.uninstall("${plugin.id}").`,
			);
		}

		// Version compatibility check
		if (plugin.minApiVersion && !isCompatible(this._apiVersion, plugin.minApiVersion)) {
			throw new Error(
				`[SEED_TUI_PLUGIN_0002] Plugin "${plugin.id}" v${plugin.version} requires ` +
					`TUI API >= ${plugin.minApiVersion}, but current API is v${this._apiVersion}. ` +
					`Update @seedcli/tui to a compatible version.`,
			);
		}

		this.plugins.set(plugin.id, plugin);
		plugin.install(this);
	}

	/**
	 * Uninstall a plugin and clean up all its registrations.
	 */
	uninstall(pluginId: string): void {
		const plugin = this.plugins.get(pluginId);
		if (!plugin) return;

		// Remove components registered by this plugin
		for (const [name, comp] of this.components) {
			if (comp.pluginId === pluginId) {
				this.components.delete(name);
			}
		}

		// Remove keymaps
		for (const [name, km] of this.keymaps) {
			if (km.pluginId === pluginId) {
				this.keymaps.delete(name);
			}
		}

		// Remove render hooks
		this.renderHooks = this.renderHooks.filter((h) => h.pluginId !== pluginId);

		// Call dispose
		plugin.dispose?.();
		this.plugins.delete(pluginId);
	}

	/**
	 * Register a custom component.
	 * Name must be namespaced: "vendor/component-name".
	 */
	registerComponent(
		pluginId: string,
		name: string,
		factory: ComponentFactory,
		version?: string,
	): void {
		// Validate namespace
		if (!name.includes("/")) {
			throw new Error(
				`[SEED_TUI_PLUGIN_0003] Component name "${name}" must be namespaced ` +
					`(e.g. "${pluginId.split("/")[0] || "vendor"}/${name}"). ` +
					`Namespacing prevents conflicts between plugins.`,
			);
		}

		// Check for conflicts
		const existing = this.components.get(name);
		if (existing && existing.pluginId !== pluginId) {
			throw new Error(
				`[SEED_TUI_PLUGIN_0004] Component "${name}" is already registered by ` +
					`plugin "${existing.pluginId}" (v${existing.version}). ` +
					`To resolve: either uninstall "${existing.pluginId}" or use a different component name.`,
			);
		}

		this.components.set(name, {
			pluginId,
			factory,
			version: version ?? "1.0.0",
		});
	}

	/**
	 * Create a component instance by name.
	 */
	createComponent(name: string, options?: Record<string, unknown>): TuiNode {
		const comp = this.components.get(name);
		if (!comp) {
			const available = this.registeredComponents.join(", ") || "none";
			throw new Error(
				`[SEED_TUI_PLUGIN_0005] Component "${name}" is not registered. ` +
					`Available components: ${available}`,
			);
		}
		return comp.factory(options ?? {});
	}

	/**
	 * Check if a component is registered.
	 */
	hasComponent(name: string): boolean {
		return this.components.has(name);
	}

	/**
	 * Register keymap bindings for a plugin.
	 */
	registerKeymap(pluginId: string, name: string, bindings: KeymapBinding[]): void {
		this.keymaps.set(`${pluginId}/${name}`, { pluginId, bindings });
	}

	/**
	 * Get all keymap bindings from all plugins.
	 */
	getAllKeymapBindings(): KeymapBinding[] {
		const all: KeymapBinding[] = [];
		for (const km of this.keymaps.values()) {
			all.push(...km.bindings);
		}
		return all;
	}

	/**
	 * Register a render hook.
	 */
	registerRenderHook(pluginId: string, phase: "before" | "after", hook: RenderHook): void {
		this.renderHooks.push({ pluginId, phase, hook });
	}

	/**
	 * Run all render hooks for a given phase.
	 */
	runRenderHooks(phase: "before" | "after", root: TuiNode): void {
		for (const rh of this.renderHooks) {
			if (rh.phase === phase) {
				rh.hook(root);
			}
		}
	}

	/**
	 * Dispose all plugins and clear the registry.
	 */
	dispose(): void {
		for (const plugin of this.plugins.values()) {
			plugin.dispose?.();
		}
		this.plugins.clear();
		this.components.clear();
		this.keymaps.clear();
		this.renderHooks.length = 0;
	}
}

// ─── Version Compatibility ───

/**
 * Simple semver major version compatibility check.
 * Returns true if current >= required based on major.minor.
 */
function isCompatible(current: string, required: string): boolean {
	const [cMajor, cMinor] = current.split(".").map(Number);
	const [rMajor, rMinor] = required.split(".").map(Number);

	if (cMajor > rMajor) return true;
	if (cMajor === rMajor && cMinor >= rMinor) return true;
	return false;
}
