import type {
	AppConfig,
	CapabilityProfile,
	RenderMode,
	TerminalCapabilities,
	TuiNode,
} from "@seedcli/tui-core";

// ─── App ───

export interface TuiApp {
	/** Mount a root node tree. */
	mount(root: TuiNode): void;
	/** Manually trigger a render (for manual mode). */
	render(): void;
	/** Start the app lifecycle (enter interactive mode). */
	run(): Promise<void>;
	/** Stop the app and restore terminal state. */
	stop(): Promise<void>;
	/** App-level key-value state store. */
	state: AppStateManager;
	/** Detected terminal capabilities. */
	capabilities: TerminalCapabilities;
	/** Current lifecycle state. */
	readonly lifecycleState: LifecycleState;
}

export type LifecycleState = "idle" | "starting" | "running" | "stopping" | "stopped";

export interface AppStateManager {
	get<T>(key: string): T | undefined;
	set<T>(key: string, value: T): void;
	delete(key: string): boolean;
	has(key: string): boolean;
	subscribe(key: string, cb: (value: unknown) => void): () => void;
}

// ─── TUI Module ───

export interface TuiModule {
	/** Create a new TUI app instance. */
	createApp(config: AppConfig): TuiApp;

	// Primitives
	text(content: string, props?: import("@seedcli/tui-core").TuiNodeProps): TuiNode;
	box(props: import("@seedcli/tui-core").TuiNodeProps, ...children: TuiNode[]): TuiNode;
	row(props: import("@seedcli/tui-core").TuiNodeProps, ...children: TuiNode[]): TuiNode;
	column(props: import("@seedcli/tui-core").TuiNodeProps, ...children: TuiNode[]): TuiNode;
	spacer(props?: import("@seedcli/tui-core").TuiNodeProps): TuiNode;

	// Components
	input(options?: import("./components/input.js").InputOptions): TuiNode;
	select(options: import("./components/select.js").SelectOptions): TuiNode;
	list(options: import("./components/list.js").ListOptions): TuiNode;
	scrollBox(options: import("./components/scroll-box.js").ScrollBoxOptions, ...children: TuiNode[]): import("./components/scroll-box.js").ScrollBoxNode;
	table(options: import("./components/table.js").TableOptions): TuiNode;
	markdown(content: string, props?: import("@seedcli/tui-core").TuiNodeProps): TuiNode;
	code(options: import("./components/code.js").CodeOptions): TuiNode;
	progress(options: import("./components/progress.js").ProgressOptions): TuiNode;

	// Detection
	detectCapabilities(): TerminalCapabilities;
}
