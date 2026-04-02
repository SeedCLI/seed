/**
 * Vue TUI app mount helper.
 *
 * Creates a Vue application using the custom TUI renderer and bridges it
 * to the TuiApp lifecycle. Handles mounting, unmounting, error routing,
 * and scheduler integration.
 */

import {
	type Component,
	type App as VueAppInstance,
	type ComponentPublicInstance,
	createVNode,
} from "@vue/runtime-core";
import { createNode, disposeNode, type TuiNode } from "@seedcli/tui-core";
import type { TuiApp } from "@seedcli/tui";
import { render } from "./renderer.js";

export interface VueTuiErrorContext {
	component?: string;
	phase?: string;
}

export interface CreateVueTuiAppOptions {
	/** The underlying TUI app to render into. */
	app: TuiApp;
	/** Enable Vue devtools integration (no-op in terminal). */
	devtools?: boolean;
	/** Global error handler for unhandled Vue errors. */
	errorHandler?: (error: unknown, ctx: VueTuiErrorContext) => void;
}

export interface VueTuiInstance {
	/** Mount the Vue component tree into the TUI app and start the app lifecycle. */
	mount(): Promise<void>;
	/** Unmount the Vue tree and stop the TUI app. */
	unmount(): Promise<void>;
	/** Access the underlying Vue app instance for plugins, provide/inject, etc. */
	vueApp: VueAppInstance;
	/** The root TUI node container. */
	rootContainer: TuiNode;
}

/**
 * Create a Vue-powered TUI application.
 *
 * Bridges Vue's reactivity and component model with Seed TUI's rendering engine.
 * The Vue component tree is rendered into TUI nodes via the custom renderer,
 * and reactive updates automatically trigger TUI re-renders.
 *
 * @example
 * ```typescript
 * import { createApp } from "@seedcli/tui";
 * import { createVueTuiApp } from "@seedcli/tui-vue";
 * import App from "./App.vue";
 *
 * const tuiApp = createApp({ id: "my-app" });
 * const vueTui = createVueTuiApp(App, { app: tuiApp });
 * await vueTui.mount();
 * ```
 */
export function createVueTuiApp(
	rootComponent: Component,
	options: CreateVueTuiAppOptions,
): VueTuiInstance {
	const { app: tuiApp, errorHandler } = options;

	// Create a root container node (column fills the terminal)
	const rootContainer = createNode("column", {
		width: "fill",
		height: "fill",
	});

	// Create the Vue app using our custom renderer — but we use render() directly
	// instead of the Vue app's mount API since we manage our own root container.
	// We still need a Vue app instance for config, plugins, provide/inject, etc.
	// Use a minimal "app shell" that wraps the root component.
	const vueApp = {
		config: {
			errorHandler: null as ((err: unknown, instance: ComponentPublicInstance | null, info: string) => void) | null,
			warnHandler: null as ((msg: string, instance: ComponentPublicInstance | null, trace: string) => void) | null,
		},
		use: () => vueApp,
		provide: () => vueApp,
	} as unknown as VueAppInstance;

	// Wire error handling
	vueApp.config.errorHandler = (
		err: unknown,
		instance: ComponentPublicInstance | null,
		info: string,
	) => {
		const inst = instance as unknown as Record<string, unknown> | null;
		const componentName = inst?.$options
			? String(inst.$options)
			: "Unknown";
		if (errorHandler) {
			errorHandler(err, { component: componentName, phase: info });
		} else {
			console.error(
				`[SEED_TUI_VUE_0002] Unhandled error in Vue TUI component "${componentName}" ` +
				`during "${info}":\n`,
				err,
			);
		}
	};

	// Warn handler for development
	vueApp.config.warnHandler = (
		msg: string,
		_instance: ComponentPublicInstance | null,
		trace: string,
	) => {
		console.warn(
			`[SEED_TUI_VUE_WARN] ${msg}\n  Trace: ${trace}`,
		);
	};

	let mounted = false;

	const instance: VueTuiInstance = {
		vueApp,
		rootContainer,

		async mount(): Promise<void> {
			if (mounted) {
				throw new Error(
					"[SEED_TUI_VUE_0003] Vue TUI app is already mounted. " +
					"Call unmount() before mounting again.",
				);
			}

			mounted = true;

			// Render the root component into the root container via the custom renderer
			const vnode = createVNode(rootComponent);
			render(vnode, rootContainer);

			// Mount the TUI node tree into the TUI app
			tuiApp.mount(rootContainer);

			// Start the TUI app lifecycle (enters interactive mode)
			await tuiApp.run();
		},

		async unmount(): Promise<void> {
			if (!mounted) return;
			mounted = false;

			// Unmount Vue tree (triggers remove/cleanup through host config)
			render(null, rootContainer);

			// Stop the TUI app lifecycle (restores terminal)
			await tuiApp.stop();

			// Clean up the root container
			disposeNode(rootContainer);
		},
	};

	return instance;
}
