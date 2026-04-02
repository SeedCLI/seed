// Types
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

// Session
export { StdTerminalSession } from "./session/std-terminal-session.js";
export { MemoryTerminalSession } from "./session/memory-terminal-session.js";

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
export { RenderScheduler } from "./render/scheduler.js";
export type { SchedulerOptions } from "./render/scheduler.js";

// Input
export { parseKeyEvents } from "./input/parser.js";
export { FocusManager } from "./input/focus.js";
export { dispatchEvent, dispatchKeyEvent } from "./input/events.js";

// Tracing
export { TraceCollector } from "./tracing.js";
export type {
	FocusTraceEvent,
	InputTraceEvent,
	LayoutTraceEvent,
	RenderTraceEvent,
	TraceEvent,
	TraceHooks,
	TraceSummary,
} from "./tracing.js";

// Testing utilities
export { assertFrameSnapshot, diffSnapshots, serializeFrame, serializeFrameWithStyles, serializeTree } from "./testing/snapshot.js";
export { VirtualClock, createVirtualClock } from "./testing/clock.js";
export { keyToBytes, simulateKey, simulateKeySequence, simulatePaste, simulateResize, simulateType, stringToBytes } from "./testing/input-sim.js";
