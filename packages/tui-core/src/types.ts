// ─── Terminal Session ───

export interface TerminalSize {
	columns: number;
	rows: number;
}

export interface TerminalSession {
	size(): TerminalSize;
	write(data: string): void;
	onData(cb: (input: Uint8Array) => void): () => void;
	onResize(cb: (size: TerminalSize) => void): () => void;
	setRawMode(enabled: boolean): void;
	enterAlternateScreen(): void;
	exitAlternateScreen(): void;
	showCursor(show: boolean): void;
	dispose(): void;
}

// ─── Node Tree ───

export type NodeType = "text" | "box" | "row" | "column" | "spacer" | "component";

export type SizeValue = number | "fill" | "auto" | `${number}%`;

export interface SizeConstraints {
	width?: SizeValue;
	height?: SizeValue;
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
}

export type OverflowPolicy = "clip" | "wrap" | "scroll" | "visible";

export type Alignment = "start" | "center" | "end" | "stretch";

export interface BorderConfig {
	style: "none" | "single" | "double" | "rounded" | "bold" | "ascii";
	color?: string;
}

export interface StyleProps {
	color?: string;
	bgColor?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	dim?: boolean;
	inverse?: boolean;
}

export interface TuiNodeProps extends SizeConstraints, StyleProps {
	id?: string;
	gap?: number;
	padding?: number | [number, number] | [number, number, number, number];
	border?: BorderConfig | BorderConfig["style"];
	overflow?: OverflowPolicy;
	alignItems?: Alignment;
	alignSelf?: Alignment;
	justifyContent?: "start" | "center" | "end" | "space-between" | "space-around";
	focusable?: boolean;
	tabIndex?: number;
	visible?: boolean;
}

export interface TuiNode {
	readonly type: NodeType;
	readonly id: string;
	props: TuiNodeProps;
	children: TuiNode[];
	parent: TuiNode | null;
	content?: string;
	dirty: boolean;
	// Computed layout (set by layout engine)
	layout: ComputedLayout;
	// Event handlers
	handlers: Map<string, Set<EventHandler>>;
}

export interface ComputedLayout {
	x: number;
	y: number;
	width: number;
	height: number;
	scrollX: number;
	scrollY: number;
}

// ─── Events ───

export type KeyModifier = "ctrl" | "alt" | "shift" | "meta";

export interface KeyEvent {
	key: string;
	raw: Uint8Array;
	modifiers: Set<KeyModifier>;
	handled: boolean;
	stopPropagation(): void;
}

export interface FocusEvent {
	type: "focus" | "blur";
	target: TuiNode;
	relatedTarget: TuiNode | null;
}

export interface ResizeEvent {
	columns: number;
	rows: number;
	previousColumns: number;
	previousRows: number;
}

export interface PasteEvent {
	text: string;
	handled: boolean;
	stopPropagation(): void;
}

export type TuiEvent = KeyEvent | FocusEvent | ResizeEvent | PasteEvent;
export type EventHandler = (event: TuiEvent) => void | Promise<void>;

// ─── Render ───

export interface Cell {
	char: string;
	fg?: string;
	bg?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	dim?: boolean;
	inverse?: boolean;
	strikethrough?: boolean;
}

export interface Frame {
	width: number;
	height: number;
	cells: Cell[][];
	revision: number;
}

export interface FramePatch {
	changes: Array<{
		x: number;
		y: number;
		cell: Cell;
	}>;
	revision: number;
}

export type RenderMode = "auto" | "manual";

// ─── App ───

export type LifecycleState = "idle" | "starting" | "running" | "stopping" | "stopped";

export type CapabilityProfile = "full" | "reduced" | "static" | "stream" | "plain";

export interface ColorCapability {
	depth: "none" | "16" | "256" | "truecolor";
	noColor: boolean;
}

export interface TerminalCapabilities {
	isTTY: boolean;
	color: ColorCapability;
	mouseTracking: boolean;
	alternateScreen: boolean;
	unicode: boolean;
	profile: CapabilityProfile;
}

export interface AppConfig {
	id: string;
	title?: string;
	alternateScreen?: boolean;
	renderMode?: RenderMode;
	fpsCap?: number;
	fallback?: "throw" | "static" | "stream" | "plain";
	devMode?: boolean;
	animations?: boolean;
}
