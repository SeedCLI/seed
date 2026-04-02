// Types

export { dispatchEvent, dispatchKeyEvent } from "./input/events.js";
export { FocusManager } from "./input/focus.js";
// Input
export { parseKeyEvents } from "./input/parser.js";
// Layout
export { computeLayout } from "./layout/engine.js";
// Render
export {
	createFrame,
	diffFrames,
	frameToAnsi,
	patchToAnsi,
	renderTree,
} from "./render/renderer.js";
export type { SchedulerOptions } from "./render/scheduler.js";
export { RenderScheduler } from "./render/scheduler.js";
export { MemoryTerminalSession } from "./session/memory-terminal-session.js";
// Session
export { StdTerminalSession } from "./session/std-terminal-session.js";
export { createVirtualClock, VirtualClock } from "./testing/clock.js";
export {
	keyToBytes,
	simulateKey,
	simulateKeySequence,
	simulatePaste,
	simulateResize,
	simulateType,
	stringToBytes,
} from "./testing/input-sim.js";
// Testing utilities
export {
	assertFrameSnapshot,
	diffSnapshots,
	serializeFrame,
	serializeFrameWithStyles,
	serializeTree,
} from "./testing/snapshot.js";
export type {
	FocusTraceEvent,
	InputTraceEvent,
	LayoutTraceEvent,
	RenderTraceEvent,
	TraceEvent,
	TraceHooks,
	TraceSummary,
} from "./tracing.js";
// Tracing
export { TraceCollector } from "./tracing.js";
// Tree
export {
	addEventListener,
	appendChild,
	clearDirty,
	createNode,
	disposeNode,
	findFocusableNodes,
	findNodeById,
	insertBefore,
	markDirty,
	removeChild,
	resetIdCounter,
	setContent,
	updateProps,
} from "./tree/node.js";
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
	LifecycleState,
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
} from "./types.js";
