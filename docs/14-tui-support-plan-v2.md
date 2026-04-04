# TUI Support Plan for Seed CLI (v2 — Enhanced)

> Comprehensive specification and implementation plan for adding first-class TUI development to the Seed CLI framework. This document supersedes the original `14-tui-support-plan.md` with detailed technical requirements, customer perspective, competitive analysis, and concrete codebase integration details.
>
> Companion documents:
> - `docs/14-tui-enhanced-requirements.md` — Detailed R1-R11 acceptance criteria, edge cases, cross-platform specifics
> - `docs/14-tui-competitive-analysis.md` — Framework competitive analysis (Ink, Blessed, Bubbletea, Textual, Ratatui)

---

## 1. Executive Summary

Seed CLI currently supports rich terminal output (`@seedcli/print`) and lightweight UI helpers (`@seedcli/ui`), but does not provide a stateful terminal application runtime. This plan adds a full TUI capability so command authors can build interactive terminal apps (forms, dashboards, navigable lists, multi-pane workflows) with the same type-safe developer experience as existing Seed modules.

**MVP deliverables:**
- `@seedcli/tui-core` — Internal engine (terminal session, retained tree, layout, input, renderer)
- `@seedcli/tui` — Public Seed-facing API (app factory, primitives, components, theming)
- `@seedcli/tui-vue` — Vue custom renderer adapter package

**Key differentiators vs existing frameworks:**
- **Vue-first**: The only first-class Vue reconciler for terminal apps (Ink owns React)
- **TypeScript-native**: Strict typing from components to events to state, built on Bun
- **Seed ecosystem integration**: Module injection, typed `seed.tui`, unified testing
- **Intelligent degradation**: 5-tier capability profiles, not just "throw or static"

---

## 2. Target Users and Developer Perspective

### 2.1 Developer Personas

| Persona | Description | Primary Needs |
|---------|-------------|---------------|
| **CLI Tool Author** | Builds command-centric tools, wants interactive prompts/tables/workflows | Low boilerplate, safe terminal cleanup, `createApp()` one-call lifecycle |
| **DevOps Dashboard Builder** | Needs real-time status panels with low-latency updates | Live data binding, virtualized lists, keyboard navigation, async-safe components |
| **Platform Team Engineer** | Maintains internal developer tooling | Strong typing, plugin capability, deterministic tests, stable APIs |
| **Workflow Builder** | Creates git-like or file-manager terminal apps | Focus behavior, list virtualization, discoverable shortcuts |
| **Plugin Ecosystem Contributor** | Publishes reusable TUI widgets | Extension APIs, versioning, conflict handling, compatibility guarantees |

### 2.2 Developer Journey

| Stage | Goal | Current Ecosystem Friction | Seed TUI Solution |
|-------|------|---------------------------|-------------------|
| 1. First run | "Hello TUI" in < 5 minutes | Boilerplate around terminal session and cleanup | `createApp()` with safe lifecycle defaults |
| 2. Basic interaction | Add keyboard nav and input | Manual key parsing and focus logic | Built-in parser + focus manager + Input/List components |
| 3. Real data | Bind async API data to UI | Re-render churn, race conditions | Scheduler batching, state patterns, async-safe components |
| 4. Complex layout | Build dashboards with resizable panes | Fragile manual layout and clipping bugs | Deterministic row/column layout + overflow policies |
| 5. Production hardening | Handle CI/non-TTY/partial capability | Inconsistent fallback behavior | 5-tier capability detection + degrade profiles |
| 6. Debug and test | Reproduce input/render bugs | Hard-to-test terminal behavior | Memory terminal, deterministic snapshots, debug overlay |
| 7. Scale and extend | Add plugins and custom components | Undocumented extension hooks | Typed registry + versioned extension contracts |

### 2.3 Pain Points from Existing Frameworks to Avoid

| Framework | Pain Point | Seed TUI Avoidance Strategy |
|-----------|-----------|----------------------------|
| **Ink** | Limited terminal-specific debugging; render churn hard to reason about | Built-in frame/debug inspector, per-component render stats |
| **Blessed** | Imperative mutation-heavy APIs; aging ecosystem | Declarative typed API with deterministic reconciliation |
| **Bubbletea** | Verbose for typical UI composition in JS/TS ecosystems | Declarative component tree + optional explicit state machine pattern |
| **Textual** | Python-only; async/event orchestration complex without guardrails | Node-native toolchain, typed async boundaries, first-class cancellation |
| **Ratatui** | No component abstraction; manual everything | Retain flexibility via manual render mode, but provide high-level components by default |

### 2.4 DX Requirements

**Error Messages:**
1. Every runtime error SHALL include a stable error code (`SEED_TUI_xxxx`)
2. Errors SHALL include component path, cause, and remediation suggestions
3. Capability errors SHALL include detected capability matrix and override flags

**Debugging Tools:**
1. Dev mode with optional on-screen debug overlay (FPS, dirty nodes, focus target, event queue depth)
2. Event tracing hooks for input, focus, layout, and render phases
3. Frame snapshot export command for bug reports

**Hot Reload (dev mode):**
1. File change reload target `<700ms` (p95) for moderate apps
2. Support `preserve-state` and `full-restart` modes
3. On failure, keep last stable frame and print actionable diagnostics

**Dev Mode Guardrails:**
1. Warn on long synchronous handlers (`>16ms`)
2. Warn on listener/timer leaks at app shutdown
3. Warn when frame budget is consistently exceeded

---

## 3. Competitive Analysis Summary

> Full analysis in `docs/14-tui-competitive-analysis.md`

### Feature Matrix

| Framework | Language | Pattern | Layout | State Management | Vue Support |
|-----------|----------|---------|--------|-----------------|-------------|
| **Ink** | TypeScript | Retained, Declarative | Flexbox (Yoga) | React State/Context | No |
| **Blessed** | JavaScript | Retained, Imperative | Absolute/Manual | Manual, Mutable | No |
| **Bubbletea** | Go | Immediate/TEA | Manual (Lipgloss) | Elm Architecture | No |
| **Textual** | Python | Retained, Reactive | CSS-based Flexbox | Reactive Vars | No |
| **Ratatui** | Rust | Immediate | Manual Rects | Fully Manual | No |
| **OpenTUI** | TypeScript | Retained | Row/Column flow | Stateful nodes | Adapter layer |
| **Seed TUI** | TypeScript | Retained, Reactive | Row/Column + constraints | Multi-pattern | **First-class** |

### Seed TUI Unique Positioning

1. **"The Vue of the Terminal"** — Own the Vue ecosystem for TUI (Ink owns React)
2. **TypeScript-first with strict types** — Props, events, state, all fully typed
3. **Integrated with a full CLI framework** — Not standalone; works with `seed.print`, `seed.prompt`, `seed.filesystem`
4. **Intelligent degradation** — Not binary throw/static, but 5-tier capability profiles
5. **Built-in dev tools** — Debug overlay, frame trace, capability report from day one

---

## 4. Current Seed CLI Baseline

### 4.1 Module Injection Pattern

**Location:** `packages/core/src/runtime/runtime.ts` (lines 534-548)

```typescript
const modules: Array<[string, string, string?]> = [
  ["print", "@seedcli/print", "print"],
  ["prompt", "@seedcli/prompt"],
  // ... other modules ...
  ["ui", "@seedcli/ui"],
];
```

Three-tier loading: pre-registered (`registerModule()`) → cache lookup → dynamic import (`Promise.allSettled()`).

**TUI integration point:** Add `["tui", "@seedcli/tui"]` to this array.

### 4.2 Seed Type Surface

**Location:** `packages/core/src/types/seed.ts` (lines 35-68)

The `Seed<TArgs, TFlags>` interface includes all modules. TUI will add:
```typescript
tui: typeof import("@seedcli/tui");
```

### 4.3 Build System

**Location:** `scripts/build.ts`

Three-tier dependency-aware build:
- Tier 0: no internal deps (`strings`, `semver`, etc.)
- Tier 1: depends on tier 0 (`print`, `prompt`, etc.)
- Tier 1.5: depends on tier 1 (`ui`)
- Tier 2: depends on tier 1 (`core`, `testing`, `seed`)

**TUI packages will be:**
- `tui-core` → Tier 0 (no Seed coupling)
- `tui` → Tier 1.5 (depends on `print` for style helpers)
- `tui-vue` → Tier 1.5 (depends on `tui`, Vue)

### 4.4 Package Conventions

All packages follow:
```json
{
  "name": "@seedcli/[package]",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "engines": { "bun": ">=1.3.0" },
  "dependencies": { "@seedcli/[dep]": "workspace:*" }
}
```

### 4.5 Testing Infrastructure

- Framework: Bun's built-in `bun:test` (describe, test, expect)
- Test files: `packages/*/tests/*.test.ts`
- Testing utilities: `@seedcli/testing` (createTestCli, mockSeed, createInterceptor)
- TUI will need: `MemoryTerminalSession`, snapshot serializer, virtual clock

### 4.6 Umbrella Re-exports

**Location:** `packages/seed/src/index.ts`

Pattern: categorized re-exports with aliasing to prevent naming conflicts.

---

## 5. Architecture

### 5.1 Package Topology

```
packages/
├── tui-core/          # Internal engine (no Seed coupling)
│   ├── src/
│   │   ├── session/   # Terminal session abstraction
│   │   ├── tree/      # Retained node tree + reconciliation
│   │   ├── layout/    # Layout engine (row/column/constraints)
│   │   ├── render/    # Frame diff + renderer + scheduler
│   │   ├── input/     # Key parser + focus manager + event dispatch
│   │   └── index.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.build.json
│
├── tui/               # Public Seed-facing API
│   ├── src/
│   │   ├── app.ts           # App factory (createApp)
│   │   ├── primitives.ts    # text, box, row, column, spacer
│   │   ├── components/      # Input, Select, ScrollBox, Table, Markdown, Code, Progress
│   │   ├── theme.ts         # Theming system
│   │   ├── state.ts         # State management patterns
│   │   ├── types.ts         # TuiModule interface
│   │   └── index.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.build.json
│
├── tui-vue/           # Vue custom renderer adapter
│   ├── src/
│   │   ├── renderer.ts      # Vue custom renderer host config
│   │   ├── mount.ts         # Vue mount helpers for TUI apps
│   │   ├── components.ts    # Vue-specific component bindings
│   │   └── index.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.build.json
```

### 5.2 Core Engine Contracts

```typescript
// Terminal Session
interface TerminalSession {
  size(): { columns: number; rows: number };
  write(data: string): void;
  onData(cb: (input: Uint8Array) => void): () => void;
  onResize(cb: (size: { columns: number; rows: number }) => void): () => void;
  setRawMode(enabled: boolean): void;
  enterAlternateScreen(): void;
  exitAlternateScreen(): void;
  showCursor(show: boolean): void;
  dispose(): void;
}

// App Lifecycle
interface TuiApp {
  mount(root: TuiNode): void;
  render(): void;                    // manual mode
  invalidate(subtreeId?: string, reason?: string): void;
  run(): Promise<void>;
  stop(): Promise<void>;
  state: AppStateManager;
  capabilities: CapabilityProfile;
}

// Capability Profiles (5-tier degradation)
type CapabilityProfile = 'full' | 'reduced' | 'static' | 'stream' | 'plain';
```

### 5.3 Public API Sketch (MVP)

```typescript
import { build, command } from "@seedcli/core";

const dashboard = command({
  name: "dashboard",
  run: async ({ tui }) => {
    const app = tui.createApp({
      id: "dashboard",
      title: "Seed Dashboard",
      alternateScreen: true,
      renderMode: "auto",
      fpsCap: 30,
      fallback: "static",
    });

    app.mount(
      tui.column(
        { width: "fill", height: "fill", gap: 1 },
        tui.box({ border: "rounded", padding: 1 }, tui.text("Hello from Seed TUI")),
        tui.select({
          items: ["Projects", "Tasks", "Settings"],
          onChange: (value) => app.state.set("menu", value),
        }),
      ),
    );

    await app.run();
  },
});
```

---

## 6. Requirements (Detailed)

> Full measurable criteria, edge cases, and cross-platform specifics in `docs/14-tui-enhanced-requirements.md`

### 6.0 Baseline Assumptions

**Reference Environments:**
1. macOS 14+ with zsh, iTerm2, and Terminal.app
2. Ubuntu 22.04+ with bash/zsh, GNOME Terminal, Alacritty, and tmux
3. Windows 11 with PowerShell, Windows Terminal (ConPTY), and Git Bash

**Benchmark Profile:**
- Bun runtime
- 8+ logical CPU cores, 16 GB RAM
- Local terminal session (no SSH latency)
- 300 rendered nodes, 30 focusable nodes, 1 active input source

### R1. TUI Runtime Lifecycle

**User Story:** As a CLI author, I want to start and stop a TUI app safely so that terminal state is always restored.

**Key Measurable Criteria:**
- Session init: `<100ms` (p95)
- Terminal restoration on exit: `<50ms` (p95)
- Shutdown idempotent: `app.stop()` callable multiple times safely
- Zero listener leak delta on process/stdin/stdout after run completes
- Signal handling: SIGINT, SIGTERM, SIGBREAK (Windows)

**Critical Edge Cases:**
- `run()` called twice without `stop()`
- Terminal detaches mid-session (EPIPE, closed stdout)
- `process.exit()` called inside component event handler
- Signal arrives during flush or layout pass
- App throws during initialization before first frame

### R2. Retained Tree Rendering

**User Story:** As a CLI author, I want declarative UI nodes that update incrementally so interactive UIs remain responsive.

**Key Measurable Criteria:**
- Zero output bytes when no visual changes detected
- Diffed flush `<=10%` of full-frame bytes for localized updates
- Auto-mode: coalesce updates within one event-loop tick into single render
- Resize re-layout+render: `<33ms` (p95) at 30 FPS cap
- Guarantee at least one flushed frame every `100ms` under high update pressure
- Idle CPU: `<1%`

### R3. Input and Focus

**User Story:** As a CLI author, I want keyboard-driven interactions with focus traversal.

**Key Measurable Criteria:**
- Key dispatch latency: `<16ms` (p95) from byte arrival to handler
- Deterministic Tab/Shift+Tab traversal following tab order
- Focus fallback when focused node is removed
- Bracketed paste mode support
- ESC ambiguity handling (standalone vs Alt-modified sequences)

### R4. Layout Primitives

**User Story:** As a CLI author, I want row/column layouts and sizing rules for dashboards and forms.

**Key Measurable Criteria:**
- 500-node layout pass: `<4ms` median, `<8ms` (p95)
- Constraint system: fixed, fill, auto, min, max — deterministic regardless of insertion order
- Overflow policies: clip, wrap, scroll per container
- Nested row/column at depth `>=10` without numeric drift
- Scroll offset preservation on unrelated sibling updates

### R5. Core Components

**User Story:** As a CLI author, I want built-in interactive widgets for common TUI screens.

**MVP Component Set:**
| Component | Key Features |
|-----------|-------------|
| `Input` | Cursor movement, insertion, deletion, home/end, masked mode |
| `Select` | Single-choice keyboard navigation, optional typeahead |
| `List` | Multi-item display, virtualization for 10,000+ items (`<50ms` p95 nav) |
| `ScrollBox` | Vertical scrolling, stable viewport during live content append |
| `Table` | Fixed/flexible column widths, overflow truncation |
| `Markdown` | Headings, emphasis, lists, code blocks, inline code, links |
| `Code` | Line numbers, wrapping modes, theme tokens |
| `Progress` | Determinate/indeterminate progress indication |

### R6. Seed Runtime Integration

**User Story:** As a Seed CLI user, I want TUI to feel native — same API shape and typing as other modules.

**Key Criteria:**
- `seed.tui` fully typed with IntelliSense
- `.exclude(["tui"])` throws same error shape as other modules
- `@seedcli/seed` re-exports TUI APIs
- Commands not using `tui` incur zero startup cost (lazy-load verified by test)
- Module load overhead: `<30ms` (p95)

### R7. Non-interactive Fallback (5-Tier Degradation)

**User Story:** As an operator, I want commands to degrade gracefully in CI or piped mode.

**Capability Profiles:**
| Profile | Description | When Activated |
|---------|-------------|---------------|
| `full` | Full interactive + color + advanced controls | Interactive TTY with full capabilities |
| `reduced` | Interactive but limited visuals | Partial capability TTY |
| `static` | One-shot summary view | `fallback: "static"` in non-TTY |
| `stream` | Line-oriented updates for piped environments | stdout piped |
| `plain` | No ANSI control sequences, pure text | `NO_COLOR` or no ANSI support |

**Environment Detection:** `stdin.isTTY`, `stdout.isTTY`, `NO_COLOR`, `TERM`, `COLORTERM`, CI markers.

### R8. Extensibility

**User Story:** As a plugin author, I want to add custom TUI components.

**Key Criteria:**
- Typed registration API for components, keymaps, render hooks
- Namespaced component registration (`vendor/component`)
- Deterministic conflict detection with plugin id and remediation text
- Plugin components run through same lifecycle cleanup as core
- API version compatibility checks

### R9. Testability

**User Story:** As a maintainer, I want deterministic tests for render/input behavior.

**Key Criteria:**
- `MemoryTerminalSession` for renderer tests without real TTY
- Snapshot serializer with normalized line endings across OS
- Input simulation for raw escape sequences, bracketed paste, resize events
- Virtual clock controls for deterministic timer/cursor-blink tests
- CI flake rate target: `<0.5%` over 30 consecutive runs

### R10. Performance and Stability

**Key Measurable Criteria:**
| Metric | Target |
|--------|--------|
| Frame compute (<=300 nodes) | `<8ms` median, `<16ms` p95 |
| Frame compute (<=1000 nodes) | `<25ms` p95 |
| Idle CPU | `<1%` |
| Memory drift (60 min mixed use) | `<10MB` |
| Sustained input (100 keys/sec) | 0 dropped events |
| Terminal restoration on fatal error | 100% success rate |

### R11. Vue Reconciler Package

**User Story:** As a Vue developer, I want to build Seed TUI apps with Vue components.

**Key Criteria:**
- Full Vue composition API support (props, slots, emits, provide/inject, watch, computed)
- Reactive update-to-flush latency: `<20ms` (p95) for 500 host nodes
- Component unmount cleans up all TUI event handlers/timers in same flush cycle
- Focus stable across keyed list updates
- Unsupported Vue features fail with runtime warnings and docs references

---

## 7. Missing Technical Considerations

### 7.1 Accessibility

1. High-contrast theme tokens with guaranteed minimum contrast policy
2. All interactions keyboard accessible with discoverable shortcut help (`?` overlay)
3. `accessibility.mode` setting: `auto`, `on`, `off`
4. Optional "linearized output" stream for screen-reader-friendly content
5. No color-only semantics — status indicators must include symbol/text equivalents

### 7.2 Internationalization and Text Handling

1. Grapheme-aware string operations (no splitting combining characters or emoji)
2. Unicode width calculation with configurable East Asian ambiguous width policy
3. RTL-aware text alignment modes with documented bidi limitations
4. UTF-8 multibyte input and paste payload support
5. Cursor movement based on graphemes, not UTF-16 code units

### 7.3 Terminal Capability Detection

1. Color depth detection: `none`, `16`, `256`, `truecolor`
2. Mouse tracking capability flags
3. Respect: `NO_COLOR`, `TERM`, `COLORTERM`, CI markers
4. User overrides: `--color=always/never`, `--tui-capabilities=<profile>`
5. Capability report in debug mode for issue triage

### 7.4 Memory Management

1. Strict disposal contracts for components and app-level resources
2. Dev mode listener/timer/subscription tracking with shutdown leak summary
3. Bounded buffers for logs/events to prevent unbounded growth
4. Soft memory budgets for component types (virtualized list caches)
5. Long-run soak tests (>=2 hours) to detect heap growth regressions

### 7.5 Animation and Transitions

1. Optional animation scheduler with FPS cap (default 30)
2. Simple transitions (enter, exit, value tween) with interruption handling
3. Honor reduced-motion setting (`animations=off`)
4. Precompute target layouts to avoid animation-induced layout thrash
5. Disabled by default in non-interactive profiles

### 7.6 State Management Patterns

Beyond the key-value store, provide optional patterns:
1. **Atom/signal-style** local reactive state
2. **Global store** with selectors and derived values
3. **Event reducer** pattern for deterministic state transitions
4. **State machine** integration for multi-step workflows
5. **Async resource** abstraction for loading/error/data states with cancellation

### 7.7 Theming System

1. Semantic tokens (`surface`, `textPrimary`, `warning`, `focusRing`), not raw colors
2. Theme inheritance and component-level overrides
3. Built-in `light`, `dark`, and custom themes
4. Runtime theme switching without remount
5. Theme engine adapts tokens to terminal capability depth (truecolor → 256 → 16 → no color)

---

## 8. Real-World User Stories

### 8.1 Git-like Interactive Rebase UI

**Acceptance Criteria:**
- First interactive frame within `300ms` for <=1000 commits
- Commit reorder without full list rerender
- Action changes (pick/squash/drop/reword) keyboard focusable
- Unsaved changes confirmation dialog
- Generated rebase todo previewable before write
- Write failure shows cause and retry path

### 8.2 Kubernetes Dashboard

**Acceptance Criteria:**
- Cluster summary renders within `500ms` after initial API response
- Watch stream batches to max 5 renders/sec
- Resource selection updates details pane while preserving list scroll
- Stale data indicator when API latency exceeds 3s
- Auto-retry with exponential backoff on watch drop
- Virtualized scroll `<60ms` p95 for resource lists
- Namespace/kind filter response within `200ms` for <=5000 resources

### 8.3 Interactive Form Wizard

**Acceptance Criteria:**
- Step 1 auto-focus on wizard start
- Synchronous validation before navigation
- Async validation with loading state and cancellation
- Conditional field visibility from previous answers
- Backward navigation preserves entered values
- Secret fields masked and excluded from debug traces

### 8.4 Log Viewer with Filtering

**Acceptance Criteria:**
- Responsive at 50,000 lines/min ingest with bounded ring buffer
- Regex filter updates viewport within `250ms` for 100,000 lines
- Pause mode buffers without moving viewport
- Resume optionally jumps to latest
- Invalid regex shows inline non-fatal error
- Color degrades gracefully on low-color terminals

### 8.5 File Manager

**Acceptance Criteria:**
- 20,000 entries interactive within `400ms` (incremental loading)
- Preview pane updates without losing list position
- File operations show progress and completion/failure status
- Destructive operations require modal confirmation with focus trap
- Permission errors show file path and system error code
- Symlinks display link target with safe navigation

---

## 9. Vue Reconciler Deep Dive (`@seedcli/tui-vue`)

### 9.1 Architecture

```
Vue Runtime → VNodes → Custom Host Config → TUI Node Mutations → TUI Scheduler → Layout + Diff → Terminal Flush
```

**Public API:**
```typescript
export interface CreateVueTuiAppOptions {
  app: TuiApp;
  devtools?: boolean;
  errorHandler?: (error: unknown, ctx: VueTuiErrorContext) => void;
}

export function createVueTuiApp(
  rootComponent: Component,
  options: CreateVueTuiAppOptions,
): {
  mount(): Promise<void>;
  unmount(): Promise<void>;
};
```

### 9.2 Host Node Model

| Node Type | Role |
|-----------|------|
| `TuiElementNode` | Mutable node for containers/components (box, row, column, input, etc.) |
| `TuiTextNode` | Leaf text node with grapheme-aware content |
| `TuiRootNode` | Bridge root between Vue tree and TuiApp mount target |

Each host node stores: node id, parent/children links, pending prop updates, event subscriptions, cleanup hooks, optional focus metadata.

### 9.3 Reactivity Pipeline

1. Vue reactivity marks component effects dirty
2. Vue scheduler batches updates in microtask queue
3. Host patch operations mutate TUI retained tree
4. Mutations call `app.invalidate(subtreeId, reason)`
5. TUI render scheduler coalesces invalidations
6. Renderer computes layout + diff + flushes to terminal

**Rules:**
- No direct terminal writes from host config
- All writes pass through core TUI scheduler
- Multiple Vue effects in same tick produce one TUI frame

### 9.4 Lifecycle Mapping

| Vue Lifecycle | TUI Mapping |
|---------------|-------------|
| `setup` | Allocate node context, bind store/event dependencies |
| `onBeforeMount` | Create host nodes, stage initial props |
| `onMounted` | Attach focus handlers and side-effect subscriptions |
| `onBeforeUpdate` | Snapshot cursor/focus-sensitive state |
| `onUpdated` | Revalidate focus and scroll anchors |
| `onBeforeUnmount` | Unregister input handlers, cancel timers/watchers |
| `onUnmounted` | Detach nodes, release memory, remove from registry |
| `onErrorCaptured` | Route to app error handler, optionally render fallback UI |

### 9.5 Performance Considerations

1. Patch-flag-aware prop updates to avoid broad invalidation
2. Static hoisting for immutable subtrees
3. Cache measured text widths by `(string, style, widthPolicy)` per frame
4. Stable keys for lists to avoid focus reset and remount churn
5. Frame budget control via `fpsCap` with dropped obsolete intermediate revisions

### 9.6 Comparison with Ink's React Reconciler

| Area | Ink (React) | Seed Vue Reconciler |
|------|-------------|---------------------|
| Reactive model | React state/hooks + concurrent rendering | Vue reactivity with explicit scheduler bridge |
| Update granularity | Fiber-based reconciliation | Vue patch flags + dirty-subtree invalidation |
| Scheduling control | React scheduler decisions | Explicit TUI frame scheduler with FPS/backpressure |
| Lifecycle cleanup | React effect cleanup | Vue lifecycle + strict TUI disposal contract |
| Focus preservation | Key stability dependent | Key-stable updates + explicit focus manager |
| Dev diagnostics | Ecosystem-dependent | Built-in TUI diagnostics (frame, focus, capability) |

---

## 10. Concrete Codebase Integration (Touch Points)

### 10.1 New Files to Create

```
packages/tui-core/
├── package.json
├── tsconfig.build.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── session/terminal-session.ts
│   ├── session/std-terminal-session.ts
│   ├── session/memory-terminal-session.ts
│   ├── tree/node.ts
│   ├── tree/reconciler.ts
│   ├── layout/engine.ts
│   ├── layout/constraints.ts
│   ├── render/diff.ts
│   ├── render/renderer.ts
│   ├── render/scheduler.ts
│   ├── input/parser.ts
│   ├── input/focus.ts
│   └── input/events.ts
└── tests/
    ├── layout.test.ts
    ├── diff.test.ts
    ├── parser.test.ts
    └── focus.test.ts

packages/tui/
├── package.json
├── tsconfig.build.json
├── src/
│   ├── index.ts
│   ├── types.ts              # TuiModule interface
│   ├── app.ts                # createApp factory
│   ├── primitives.ts         # text, box, row, column, spacer
│   ├── components/
│   │   ├── input.ts
│   │   ├── select.ts
│   │   ├── list.ts
│   │   ├── scroll-box.ts
│   │   ├── table.ts
│   │   ├── markdown.ts
│   │   ├── code.ts
│   │   └── progress.ts
│   ├── theme.ts
│   └── state.ts
└── tests/
    ├── app.test.ts
    ├── input.test.ts
    ├── select.test.ts
    └── scroll-box.test.ts

packages/tui-vue/
├── package.json
├── tsconfig.build.json
├── src/
│   ├── index.ts
│   ├── renderer.ts           # Vue custom renderer host config
│   ├── mount.ts              # createVueTuiApp
│   └── components.ts         # Vue-specific bindings
└── tests/
    ├── renderer.test.ts
    └── lifecycle.test.ts
```

### 10.2 Existing Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/types/seed.ts` | Add `tui: typeof import("@seedcli/tui")` to `Seed` interface |
| `packages/core/src/runtime/runtime.ts` | Add `["tui", "@seedcli/tui"]` to modules array |
| `packages/seed/src/index.ts` | Add TUI re-exports (aliased to prevent conflicts) |
| `tsconfig.json` | Add path aliases: `@seedcli/tui`, `@seedcli/tui-core`, `@seedcli/tui-vue` |
| `scripts/build.ts` | Add `tui-core` (Tier 0), `tui` (Tier 1.5), `tui-vue` (Tier 1.5) to build order |

### 10.3 Package Dependency Graph

```
@seedcli/tui-core  (zero internal deps)
       ↓
@seedcli/tui       (depends on: tui-core, print)
       ↓
@seedcli/tui-vue   (depends on: tui, vue)
```

---

## 11. Implementation Plan (Phased)

### Phase 0: Package Scaffolding
**Deliverables:** Package skeletons, build wiring, type surface

**Tasks:**
- [ ] Create `packages/tui-core` with package.json, tsconfig.build.json
- [ ] Create `packages/tui` with package.json, tsconfig.build.json
- [ ] Create `packages/tui-vue` with package.json, tsconfig.build.json
- [ ] Add path aliases to root `tsconfig.json`
- [ ] Add build order entries in `scripts/build.ts`
- [ ] Add package descriptions in `scripts/update-packages.ts`

**Requirements:** R6, R9

### Phase 1: Terminal Session + Minimal Renderer
**Deliverables:** `createApp` with lifecycle, basic retained tree, full-frame render

**Tasks:**
- [ ] Implement `TerminalSession` interface and `StdTerminalSession`
- [ ] Implement `MemoryTerminalSession` for tests
- [ ] Implement app lifecycle (`run`, `stop`, signal-safe cleanup)
- [ ] Implement lifecycle mutex (starting → running → stopping)
- [ ] Implement primitive nodes: text, box, row, column
- [ ] Implement layout pass v1 and static frame generation
- [ ] Implement terminal capability detection (color depth, TTY checks)
- [ ] Add benchmark baseline tests

**Requirements:** R1, R2, R4, R7, R10

### Phase 1.5: Capability Detection and Degradation *(NEW)*
**Deliverables:** 5-tier capability profiles, non-TTY fallback

**Tasks:**
- [ ] Implement capability detection (NO_COLOR, TERM, COLORTERM, isTTY)
- [ ] Implement profile selection: full → reduced → static → stream → plain
- [ ] Implement user overrides (`--tui-capabilities`, `--color`)
- [ ] Implement static render mode for non-TTY
- [ ] Add capability report in debug mode

**Requirements:** R7

### Phase 2: Input and Focus System
**Deliverables:** Keyboard parser, focus manager, event dispatch

**Tasks:**
- [ ] Parse raw keyboard sequences into normalized key events
- [ ] Handle ESC ambiguity (standalone vs Alt-modified)
- [ ] Implement bracketed paste mode support
- [ ] Implement focus graph traversal (Tab/Shift+Tab)
- [ ] Implement focus fallback when focused node is removed
- [ ] Implement propagation model (capture/target/bubble)
- [ ] Implement bounded event queue with FIFO guarantee
- [ ] Expose app-level `onKey` hooks and component handlers

**Requirements:** R3, R10

### Phase 3: Core Components
**Deliverables:** Input, Select, List, ScrollBox, Table, Markdown, Code, Progress

**Tasks:**
- [ ] Build `Input` (cursor movement, editing, masked mode)
- [ ] Build `Select` (single-choice keyboard nav, typeahead)
- [ ] Build `List` (virtualization for 10,000+ items)
- [ ] Build `ScrollBox` (vertical scrolling, stable viewport on live append)
- [ ] Build `Table` (fixed/flexible columns, overflow truncation)
- [ ] Build `Markdown` (headings, lists, code blocks, inline emphasis)
- [ ] Build `Code` (line numbers, wrapping, theme tokens)
- [ ] Build `Progress` (determinate/indeterminate)
- [ ] Add ANSI sequence sanitization for content payloads

**Requirements:** R5, R3, R4

### Phase 4: Seed Runtime + Vue Reconciler Integration
**Deliverables:** `seed.tui` injection, Vue custom renderer

**Tasks:**
- [ ] Add `["tui", "@seedcli/tui"]` to core runtime modules array
- [ ] Add `tui` to Seed type surface
- [ ] Add TUI re-exports to `@seedcli/seed`
- [ ] Verify `.exclude(["tui"])` error behavior
- [ ] Verify lazy-load (zero startup cost when unused)
- [ ] Implement Vue custom renderer host config
- [ ] Implement `createVueTuiApp` mount helper
- [ ] Bridge Vue scheduler flushes to TUI scheduler
- [ ] Add lifecycle mapping conformance tests
- [ ] Add accessibility and i18n acceptance tests

**Requirements:** R6, R7, R11

### Phase 5: Testing, Optimization, Dev Tools
**Deliverables:** Deterministic CI tests, incremental diff, debug overlay

**Tasks:**
- [ ] Add snapshot serializer with OS-normalized line endings
- [ ] Add virtual clock controls for timer/blink tests
- [ ] Add input simulation (escape sequences, paste, resize)
- [ ] Add fuzz tests (interleaved state + input + resize)
- [ ] Implement incremental diff patching
- [ ] Add benchmark suite and CI regression gate
- [ ] Add long-run soak tests (>=2 hours)
- [ ] Implement dev mode debug overlay (FPS, dirty nodes, focus, queue depth)
- [ ] Implement event tracing hooks
- [ ] Implement frame snapshot export for bug reports

**Requirements:** R2, R9, R10

### Phase 6: Plugin System + Theming
**Deliverables:** Component registry, theming engine

**Tasks:**
- [ ] Implement plugin-safe namespaced component registration
- [ ] Implement version compatibility checks
- [ ] Implement semantic theme tokens and dark/light themes
- [ ] Implement runtime theme switching
- [ ] Implement capability-adaptive theme engine
- [ ] Document extension APIs and conflict handling

**Requirements:** R8

---

## 12. Testing Strategy

| Layer | Location | Focus |
|-------|----------|-------|
| **Unit** | `packages/tui-core/tests/` | Layout algorithm, diff engine, key parser, focus traversal |
| **Component** | `packages/tui/tests/` | Input editing, select navigation, scroll behavior, markdown/code rendering |
| **Integration** | `packages/core/tests/` | `seed.tui` injection, `.exclude()` behavior, lifecycle cleanup |
| **Vue** | `packages/tui-vue/tests/` | Reconciler correctness, reactive updates, lifecycle mapping, unmount cleanup |
| **Benchmark** | `packages/tui-core/benchmarks/` | Frame time baseline, regression gates, soak tests |
| **Cross-platform** | CI matrix | Linux, macOS, Windows ConPTY for parser and lifecycle suites |

**Targets:**
- CI flake rate: `<0.5%` over 30 consecutive runs
- Snapshot serializer normalizes across OS
- All tests run without real TTY (MemoryTerminalSession)

---

## 13. Migration and Backward Compatibility

1. `@seedcli/ui` remains unchanged — no migration path needed
2. New interactive capabilities live only in `@seedcli/tui` and `@seedcli/tui-vue`
3. No breaking changes to existing command APIs
4. Commands not importing TUI incur zero additional startup cost
5. No deprecation of existing `@seedcli/ui` helpers

---

## 14. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Terminal state corruption on crashes | High | Centralized session guard with try/finally + signal hooks; 100% restoration in integration tests |
| Flaky tests from terminal-specific behavior | Medium | Abstract terminal adapter + MemoryTerminalSession + virtual clock |
| Scope creep from advanced components | Medium | Strict phase gates; ship minimal interactive core first |
| Performance regressions with large trees | Medium | Benchmark gate in CI; frame compute thresholds enforced |
| Vue scheduler conflicts with TUI scheduler | Medium | One-way pipeline: Vue job queue → host patch → TUI invalidation → render |
| Cross-platform inconsistencies | Medium | CI matrix across Linux/macOS/Windows; platform-specific escape sequence fixtures |
| Memory leaks in long-running apps | Medium | Dev mode leak tracking + soak tests (>=2 hours) |

---

## 15. Implementation Inputs (Decisions Required Before Coding)

1. **Package boundary is fixed:** `@seedcli/ui` stays unchanged; new work in `@seedcli/tui` (+ `@seedcli/tui-core`, `@seedcli/tui-vue`)
2. **MVP component set:** Input, Select, List, ScrollBox, Table, Markdown, Code, Progress
3. **Non-TTY default policy:** 5-tier degradation (full → reduced → static → stream → plain)
4. **Vue version target:** Vue 3.x (composition API)
5. **Animation in MVP?** Optional basic transitions, disabled in non-interactive profiles
6. **State management in MVP?** Key-value store + atom/signal local state; advanced patterns post-MVP
