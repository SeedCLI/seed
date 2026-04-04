import {
	type AppConfig,
	clearDirty,
	computeLayout,
	diffFrames,
	dispatchEvent,
	dispatchKeyEvent,
	FocusManager,
	type Frame,
	frameToAnsi,
	parseKeyEvents,
	patchToAnsi,
	RenderScheduler,
	renderTree,
	StdTerminalSession,
	type TerminalSession,
	type TuiNode,
} from "@seedcli/tui-core";
import { detectCapabilities } from "./capabilities.js";
import type { AppStateManager, LifecycleState, TuiApp } from "./types.js";

/**
 * Create a new TUI application instance.
 */
export function createApp(config: AppConfig): TuiApp {
	const caps = detectCapabilities();

	// Validate TTY for interactive mode
	if (!caps.isTTY && config.fallback === "throw") {
		throw new Error(
			`[SEED_TUI_0001] TUI app "${config.id}" requires an interactive terminal (TTY). ` +
				`Detected non-TTY environment. Options:\n` +
				`  - Set fallback: "static" to render a non-interactive summary\n` +
				`  - Set fallback: "stream" for line-oriented output\n` +
				`  - Set fallback: "plain" for no-ANSI text output\n` +
				`  - Run in an interactive terminal session`,
		);
	}

	let state: LifecycleState = "idle";
	let session: TerminalSession | null = null;
	let rootNode: TuiNode | null = null;
	let prevFrame: Frame | null = null;
	let stopPromise: Promise<void> | null = null;
	let inputCleanup: (() => void) | null = null;
	let resizeCleanup: (() => void) | null = null;

	const stateStore = createStateManager();
	const focusManager = new FocusManager();

	// Dispatch focus/blur events to nodes when focus changes
	focusManager.setOnFocusChange((prev, next) => {
		if (prev) {
			dispatchEvent(prev, "blur", { type: "blur", target: prev, relatedTarget: next });
		}
		if (next) {
			dispatchEvent(next, "focus", { type: "focus", target: next, relatedTarget: prev });
		}
	});

	const scheduler = new RenderScheduler({
		renderMode: config.renderMode ?? "auto",
		fpsCap: config.fpsCap ?? 30,
	});

	scheduler.onRender(() => {
		if (!session || !rootNode) return null;
		const size = session.size();
		computeLayout(rootNode, size.columns, size.rows);
		const frame = renderTree(rootNode, size.columns, size.rows, scheduler.currentRevision());
		clearDirty(rootNode);
		return frame;
	});

	scheduler.onFlush((frame: Frame) => {
		if (!session) return;

		if (prevFrame) {
			const patch = diffFrames(prevFrame, frame);
			if (patch.changes.length > 0) {
				session.write(patchToAnsi(patch));
			}
		} else {
			session.write(frameToAnsi(frame));
		}

		prevFrame = frame;
	});

	const app: TuiApp = {
		get lifecycleState() {
			return state;
		},

		capabilities: caps,
		state: stateStore,

		mount(root: TuiNode): void {
			rootNode = root;
			focusManager.setRoot(root);
			scheduler.invalidate();
		},

		render(): void {
			scheduler.requestRender();
		},

		async run(): Promise<void> {
			if (state !== "idle") {
				throw new Error(
					`[SEED_TUI_0002] Cannot start app "${config.id}" — current state is "${state}". ` +
						`An app can only be started once from "idle" state.`,
				);
			}

			// Non-interactive fallback modes
			if (
				!caps.isTTY ||
				caps.profile === "static" ||
				caps.profile === "stream" ||
				caps.profile === "plain"
			) {
				state = "running";
				// Render once and output
				if (rootNode && session === null) {
					session = new StdTerminalSession();
					const size = session.size();
					computeLayout(rootNode, size.columns, size.rows);
					const frame = renderTree(rootNode, size.columns, size.rows, 0);
					session.write(frameToAnsi(frame));
					session.dispose();
					session = null;
				}
				state = "stopped";
				return;
			}

			state = "starting";

			session = new StdTerminalSession();

			// Signal handlers for safe cleanup
			const signalCleanup = () => {
				cleanup().then(() => process.exit(130));
			};
			process.on("SIGINT", signalCleanup);
			process.on("SIGTERM", signalCleanup);

			try {
				// Enter interactive mode
				if (config.alternateScreen !== false) {
					session.enterAlternateScreen();
				}
				session.showCursor(false);
				session.setRawMode(true);

				// Input handling
				inputCleanup = session.onData((data) => {
					const events = parseKeyEvents(data);
					for (const event of events) {
						// Global exit: Ctrl+C
						if (event.key === "c" && event.modifiers.has("ctrl")) {
							app.stop();
							return;
						}

						// Focus traversal
						if (event.key === "tab") {
							focusManager.focusNext();
							scheduler.invalidate();
							event.stopPropagation();
							continue;
						}
						if (event.key === "shift-tab") {
							focusManager.focusPrevious();
							scheduler.invalidate();
							event.stopPropagation();
							continue;
						}

						// Dispatch to focused node
						const focused = focusManager.getFocused();
						if (focused) {
							dispatchKeyEvent(focused, event);
							if (event.handled) {
								scheduler.invalidate();
							}
						}
					}
				});

				// Resize handling
				resizeCleanup = session.onResize(() => {
					scheduler.invalidate();
				});

				state = "running";

				// Auto-focus the first focusable node
				if (!focusManager.getFocused()) {
					focusManager.focusNext();
				}

				// Initial render
				scheduler.invalidate();

				// Wait until stopped
				await new Promise<void>((resolve) => {
					const checkStop = setInterval(() => {
						if (state === "stopping" || state === "stopped") {
							clearInterval(checkStop);
							resolve();
						}
					}, 50);
				});
			} catch (err) {
				// Ensure terminal restoration on error
				await cleanup();
				throw err;
			} finally {
				process.off("SIGINT", signalCleanup);
				process.off("SIGTERM", signalCleanup);
			}
		},

		async stop(): Promise<void> {
			if (stopPromise) return stopPromise;
			if (state === "stopped" || state === "idle") return;

			stopPromise = cleanup();
			return stopPromise;
		},
	};

	async function cleanup(): Promise<void> {
		if (state === "stopping" || state === "stopped") return;
		state = "stopping";

		// Stop input
		if (inputCleanup) {
			inputCleanup();
			inputCleanup = null;
		}
		if (resizeCleanup) {
			resizeCleanup();
			resizeCleanup = null;
		}

		// Stop scheduler
		scheduler.stop();

		// Restore terminal
		if (session) {
			session.setRawMode(false);
			session.showCursor(true);
			if (config.alternateScreen !== false) {
				session.exitAlternateScreen();
			}
			session.dispose();
			session = null;
		}

		// Clear focus
		focusManager.clear();

		state = "stopped";
	}

	return app;
}

function createStateManager(): AppStateManager {
	const store = new Map<string, unknown>();
	const subscribers = new Map<string, Set<(value: unknown) => void>>();

	return {
		get<T>(key: string): T | undefined {
			return store.get(key) as T | undefined;
		},

		set<T>(key: string, value: T): void {
			store.set(key, value);
			const subs = subscribers.get(key);
			if (subs) {
				for (const cb of subs) {
					cb(value);
				}
			}
		},

		delete(key: string): boolean {
			const existed = store.delete(key);
			if (existed) {
				const subs = subscribers.get(key);
				if (subs) {
					for (const cb of subs) {
						cb(undefined);
					}
				}
			}
			return existed;
		},

		has(key: string): boolean {
			return store.has(key);
		},

		subscribe(key: string, cb: (value: unknown) => void): () => void {
			let subs = subscribers.get(key);
			if (!subs) {
				subs = new Set();
				subscribers.set(key, subs);
			}
			subs.add(cb);

			return () => {
				subs?.delete(cb);
				if (subs?.size === 0) {
					subscribers.delete(key);
				}
			};
		},
	};
}
