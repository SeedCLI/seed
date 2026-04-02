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
	FocusManager,
	findNodeById,
	insertBefore,
	MemoryTerminalSession,
	markDirty,
	removeChild,
	StdTerminalSession,
	setContent,
	updateProps,
} from "@seedcli/tui-core";
// App factory
export { createApp } from "./app.js";
// Capabilities
export { detectCapabilities } from "./capabilities.js";
export { type CodeOptions, code } from "./components/code.js";
// Components
export { type InputOptions, input } from "./components/input.js";
export { type ListItem, type ListOptions, list } from "./components/list.js";
export { markdown } from "./components/markdown.js";
export { type ProgressOptions, progress } from "./components/progress.js";
export {
	type ScrollBoxControls,
	type ScrollBoxNode,
	type ScrollBoxOptions,
	scrollBox,
} from "./components/scroll-box.js";
export { type SelectItem, type SelectOptions, select } from "./components/select.js";
export { type ColumnDef, type TableOptions, table } from "./components/table.js";
export type { DebugOverlayState } from "./debug.js";
// Debug tools
export { countDirtyNodes, countNodes, createDebugOverlay, FpsCounter } from "./debug.js";
export type { ComponentFactory, KeymapBinding, RenderHook, TuiPlugin } from "./plugins.js";
// Plugin system
export { PluginRegistry } from "./plugins.js";
// Primitives
export { box, column, row, spacer, text } from "./primitives.js";
export type { SerializedNode, SnapshotExport } from "./snapshot-export.js";

// Snapshot export
export { createSnapshot, snapshotToJson } from "./snapshot-export.js";
// State
export {
	type AsyncResource,
	createAsyncResource,
	createComputed,
	createEffect,
	createSignal,
	createStore,
	type Store,
} from "./state.js";
// Theme
export {
	type AccentTokens,
	applyTheme,
	type BorderTokens,
	createTheme,
	createThemeContext,
	darkTheme,
	lightTheme,
	type PrimaryTokens,
	resolveThemeForCapability,
	type SecondaryTokens,
	type StatusTokens,
	type SurfaceTokens,
	type TextTokens,
	type Theme,
	type ThemeContext,
	type TokenPath,
} from "./theme.js";
// TUI module types
export type {
	AppStateManager,
	LifecycleState,
	TuiApp,
	TuiModule,
} from "./types.js";
