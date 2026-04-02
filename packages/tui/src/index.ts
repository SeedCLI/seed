// Re-export core types
export type {
	Alignment,
	AppConfig,
	BorderConfig,
	CapabilityProfile,
	Cell,
	ColorCapability,
	ComputedLayout,
	EventHandler,
	FocusEvent,
	Frame,
	FramePatch,
	KeyEvent,
	KeyModifier,
	NodeType,
	OverflowPolicy,
	PasteEvent,
	RenderMode,
	ResizeEvent,
	SizeConstraints,
	SizeValue,
	StyleProps,
	TerminalCapabilities,
	TerminalSession,
	TerminalSize,
	TuiEvent,
	TuiNode,
	TuiNodeProps,
} from "@seedcli/tui-core";

// Re-export core utilities needed by consumers
export {
	addEventListener,
	appendChild,
	createNode,
	findNodeById,
	insertBefore,
	markDirty,
	removeChild,
	setContent,
	updateProps,
	FocusManager,
	MemoryTerminalSession,
	StdTerminalSession,
} from "@seedcli/tui-core";

// TUI module types
export type {
	AppStateManager,
	LifecycleState,
	TuiApp,
	TuiModule,
} from "./types.js";

// App factory
export { createApp } from "./app.js";

// Primitives
export { box, column, row, spacer, text } from "./primitives.js";

// Capabilities
export { detectCapabilities } from "./capabilities.js";

// Theme
export {
	type AccentTokens,
	type BorderTokens,
	type PrimaryTokens,
	type SecondaryTokens,
	type StatusTokens,
	type SurfaceTokens,
	type TextTokens,
	type Theme,
	type ThemeContext,
	type TokenPath,
	applyTheme,
	createTheme,
	createThemeContext,
	darkTheme,
	lightTheme,
	resolveThemeForCapability,
} from "./theme.js";

// State
export {
	type AsyncResource,
	type Store,
	createAsyncResource,
	createComputed,
	createEffect,
	createSignal,
	createStore,
} from "./state.js";

// Components
export { type InputOptions, input } from "./components/input.js";
export { type SelectItem, type SelectOptions, select } from "./components/select.js";
export { type ListItem, type ListOptions, list } from "./components/list.js";
export { type ScrollBoxControls, type ScrollBoxNode, type ScrollBoxOptions, scrollBox } from "./components/scroll-box.js";
export { type ColumnDef, type TableOptions, table } from "./components/table.js";
export { markdown } from "./components/markdown.js";
export { type CodeOptions, code } from "./components/code.js";
export { type ProgressOptions, progress } from "./components/progress.js";

// Debug tools
export { FpsCounter, countDirtyNodes, countNodes, createDebugOverlay } from "./debug.js";
export type { DebugOverlayState } from "./debug.js";

// Snapshot export
export { createSnapshot, snapshotToJson } from "./snapshot-export.js";
export type { SerializedNode, SnapshotExport } from "./snapshot-export.js";

// Plugin system
export { PluginRegistry } from "./plugins.js";
export type { ComponentFactory, KeymapBinding, RenderHook, TuiPlugin } from "./plugins.js";
