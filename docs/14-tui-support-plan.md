# TUI Support Plan for Seed CLI

> Detailed specification and implementation plan for adding first-class TUI development to the Seed CLI framework.

## 1. Scope and Goal

Seed CLI currently supports rich terminal output (`@seedcli/print`) and lightweight UI helpers (`@seedcli/ui`), but does not provide a stateful terminal application runtime (input loop, focus system, layout engine, incremental rendering, component lifecycle).

Goal: add a new TUI capability to Seed CLI so command authors can build interactive terminal apps (forms, dashboards, navigable lists, multi-pane workflows) with the same type-safe developer experience as existing Seed modules.

In scope for MVP:
- A Vue reconciler package (`@seedcli/tui-vue`)

Out of scope for MVP:
- Full mouse-first interactions across all components
- Browser rendering target

## 2. Current Seed CLI Baseline (What Exists Today)

Key findings from `seedcli/`:

1. Runtime architecture
- `@seedcli/core` assembles a typed `seed` object per command (`packages/core/src/runtime/runtime.ts`).
- Modules are injected via dynamic import by package name (for example `@seedcli/print`, `@seedcli/prompt`, `@seedcli/ui`).
- This injection model is the cleanest integration point for a new `@seedcli/tui` module.

2. Existing UI capability
- `@seedcli/ui` is currently compositional string output (`header`, `status`, `list`) plus a simple in-place countdown.
- No retained component tree, no diffing renderer, no focus/input state machine.

3. Testing model
- `@seedcli/testing` uses output interception and mocked modules.
- Current tests are not designed for raw mode/alternate screen lifecycle; a virtual terminal abstraction is required.

4. Packaging model
- Monorepo build order is explicit in `scripts/build.ts`.
- Root path aliases (`tsconfig.json`) and umbrella exports (`packages/seed/src/index.ts`) must be updated for any new package.

## 3. External Deep Dive Summary

## 3.1 OpenTUI (https://github.com/anomalyco/opentui)

Observed architecture and patterns:
- Core separates renderables (stateful retained nodes) from constructs (ergonomic declarative builders).
- Layout system supports row/column flow, sizing constraints (min/max), and alignment controls.
- Rendering model supports automatic re-render and manual `forceRender` style control.
- Input model supports keyboard modes and event registration.
- Rich component surface includes Input, Select, ScrollBox, Code, Markdown, Table, and higher-level primitives.
- Framework bindings are delivered as separate adapter packages, not coupled to the core renderer.

What to adopt:
- Retained tree + incremental render diff
- Separation between low-level core engine and ergonomic component API
- Adapter layer strategy, with Vue reconciler prioritized for MVP
- Explicit render mode control (auto/manual)

What to avoid:
- Multiple framework adapters in the first release; focus on Vue only.

## 3.2 charsm (https://github.com/sklyt/charsm)

Observed architecture and patterns:
- Stateful component model (`Component`, `state`, `setState`, `render`).
- Strong markdown-centric and text-centric workflow for terminal UX.
- Tries to unify CLI and TUI authoring ergonomics.
- Emphasizes JS-only runtime portability.

What to adopt:
- Simple stateful authoring ergonomics
- Markdown/code rendering as a first-class MVP feature
- Zero native dependency preference where possible

What to avoid:
- Coupling command parsing concerns directly into renderer core.
- Shipping unstable broad features before core runtime guarantees.

## 3.3 Synthesis for Seed CLI

Recommended direction:
- Build a dedicated `@seedcli/tui` package (plus a small internal core layer) integrated through Seed runtime module injection.
- Keep `@seedcli/ui` unchanged as static helpers (no feature migration from `ui` to `tui`).
- Ship a minimal but robust TUI runtime plus a Vue reconciler in MVP, including Markdown/code rendering; add additional adapters later.

## 4. Requirements (Detailed Spec)

## 4.1 Requirement R1: TUI Runtime Lifecycle
**User Story:** As a CLI author, I want to start and stop a TUI app safely, so that terminal state is always restored.

Acceptance Criteria (EARS):
1. WHEN a command calls `seed.tui.createApp(...).run()` THEN the system SHALL initialize a managed terminal session.
2. WHILE the TUI app is running the system SHALL control cursor visibility and screen buffer mode based on app config.
3. WHEN the app exits normally THEN the system SHALL restore terminal modes and cursor state.
4. IF an unhandled error occurs during app runtime THEN the system SHALL restore terminal state before rethrowing or reporting.
5. WHEN process signals (`SIGINT`, `SIGTERM`) are received during app runtime THEN the system SHALL dispose resources and restore terminal state.

## 4.2 Requirement R2: Retained Tree Rendering
**User Story:** As a CLI author, I want declarative UI nodes that update incrementally, so that interactive UIs remain responsive.

Acceptance Criteria (EARS):
1. WHEN node state changes THEN the renderer SHALL compute a minimal frame patch instead of full-screen rewrite where possible.
2. WHILE no changes exist the renderer SHALL avoid redundant writes.
3. IF `renderMode` is `manual` THEN the system SHALL render only when explicitly requested.
4. IF terminal dimensions change THEN the renderer SHALL recompute layout and redraw consistently.

## 4.3 Requirement R3: Input and Focus
**User Story:** As a CLI author, I want keyboard-driven interactions with focus traversal, so that users can navigate components without a mouse.

Acceptance Criteria (EARS):
1. WHEN the app enters interactive mode THEN keyboard events SHALL be captured and dispatched.
2. WHEN `Tab` or configured traversal keys are pressed THEN focus SHALL move to the next/previous focusable node.
3. IF a focused component handles an input event THEN the event SHALL not bubble further unless propagation is enabled.
4. WHEN app exits THEN raw input mode SHALL be disabled.

## 4.4 Requirement R4: Layout Primitives
**User Story:** As a CLI author, I want row/column layouts and basic sizing rules, so that I can build dashboards and forms.

Acceptance Criteria (EARS):
1. WHEN a node uses `row` or `column` layout THEN child placement SHALL follow direction + gap + alignment rules.
2. IF children exceed available space THEN overflow behavior SHALL follow configured clipping/scroll policy.
3. WHEN width/height constraints (`fixed`, `fill`, `auto`, `min`, `max`) are set THEN computed layout SHALL honor constraints.

## 4.5 Requirement R5: Core Components
**User Story:** As a CLI author, I want built-in interactive widgets, so that common TUI screens require minimal boilerplate.

Acceptance Criteria (EARS):
1. WHERE input capture is needed the system SHALL provide an `Input` component with controlled/uncontrolled mode.
2. WHERE list selection is needed the system SHALL provide `Select` and `List` components with keyboard navigation.
3. WHERE large content is needed the system SHALL provide a `ScrollView`/`ScrollBox` component.
4. WHERE status display is needed the system SHALL provide text, box, progress, and table primitives.
5. WHERE rich text/code display is needed the system SHALL provide `Markdown` and `Code` components.

## 4.6 Requirement R6: Seed Runtime Integration
**User Story:** As a Seed CLI user, I want TUI support to feel native, so that API shape and typing match existing modules.

Acceptance Criteria (EARS):
1. WHEN using `Seed` in a command THEN `seed.tui` SHALL be fully typed.
2. WHEN `tui` is excluded via builder `.exclude([...])` THEN access SHALL fail with the same excluded-module error behavior as other modules.
3. WHEN importing from `@seedcli/seed` THEN TUI APIs SHALL be re-exported.

## 4.7 Requirement R7: Non-interactive Fallback
**User Story:** As an operator, I want commands to degrade gracefully in CI or piped mode.

Acceptance Criteria (EARS):
1. IF `stdin` or `stdout` is not a TTY THEN interactive TUI runtime SHALL fail fast with a clear actionable message.
2. WHEN app config specifies `fallback: "static"` THEN the system SHALL render a non-interactive static summary instead of throwing.
3. WHERE ANSI is unsupported the system SHALL provide a no-color/no-control-code mode.

## 4.8 Requirement R8: Extensibility
**User Story:** As a plugin author, I want to add custom TUI components.

Acceptance Criteria (EARS):
1. WHEN plugins are loaded THEN extensions MAY register custom components or render functions into TUI registries.
2. IF a plugin component name conflicts THEN registration SHALL fail with a deterministic conflict error.

## 4.9 Requirement R9: Testability
**User Story:** As a maintainer, I want deterministic tests for render/input behavior.

Acceptance Criteria (EARS):
1. WHEN tests run in CI THEN renderer tests SHALL execute without a real TTY.
2. WHERE frame output is validated the system SHALL support snapshot-friendly serialized frame output.
3. WHEN input sequences are simulated THEN component state transitions SHALL be testable deterministically.

## 4.10 Requirement R10: Performance and Stability
**User Story:** As an end user, I want smooth interactive experiences without terminal corruption.

Acceptance Criteria (EARS):
1. WHEN rendering <= 300 nodes THEN median frame computation SHALL stay under 8ms on a standard dev machine.
2. WHILE idle the renderer SHALL avoid busy loops.
3. IF any runtime panic/error occurs THEN terminal restoration SHALL still complete.

## 4.11 Requirement R11: Vue Reconciler Package
**User Story:** As a Vue developer, I want to build Seed TUI apps with Vue components, so that I can use Vue's reactive model in terminal apps.

Acceptance Criteria (EARS):
1. WHEN using `@seedcli/tui-vue` THEN the system SHALL provide a Vue custom renderer that targets the Seed TUI node tree.
2. WHEN Vue reactive state updates THEN the reconciler SHALL update the mounted TUI tree without requiring manual full remount.
3. WHEN Vue components unmount THEN the reconciler SHALL clean up TUI resources and event handlers.
4. IF `@seedcli/tui` app lifecycle stops THEN mounted Vue roots SHALL be disposed safely.

## 5. Proposed Architecture

## 5.1 Package Topology

Introduce three packages:

1. `packages/tui-core` (internal engine surface, no Seed coupling)
- Terminal session abstraction
- Retained node tree + reconciliation
- Layout engine
- Input event parser/dispatcher
- Frame diff + renderer

2. `packages/tui` (public Seed-facing API)
- App factory (`createApp`)
- Primitives (`text`, `box`, `row`, `column`, `spacer`)
- Components (`input`, `select`, `scrollBox`, `table`, `progress`, `markdown`, `code`)
- Theming/style helpers
- `@seedcli/core` module integration type surface

3. `packages/tui-vue` (Vue renderer adapter package)
- Vue custom renderer host config targeting `@seedcli/tui` nodes
- Vue mount helpers for TUI apps
- Vue-specific bindings/utilities for component authoring

Rationale:
- Mirrors proven separation in OpenTUI (engine vs ergonomic layer).
- Keeps runtime-core testable without Seed runtime.
- Enables framework ergonomics through a dedicated adapter package while avoiding `@seedcli/ui` inflation.

## 5.2 Seed Integration Points (Required Code Touch Points)

1. `packages/core/src/types/seed.ts`
- Add `tui: typeof import("@seedcli/tui")`.

2. `packages/core/src/runtime/runtime.ts`
- Add module mapping entry: `["tui", "@seedcli/tui"]`.

3. `packages/seed/src/index.ts`
- Re-export public TUI API and types.

4. Root and package metadata
- `tsconfig.json` paths: add `@seedcli/tui`, `@seedcli/tui-core`, and `@seedcli/tui-vue`.
- `scripts/build.ts`: insert build order for new packages.
- `scripts/update-packages.ts`: descriptions/keywords entries.

## 5.3 Public API Sketch (MVP)

```ts
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

## 5.4 Core Engine Contracts

```ts
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

interface TuiApp {
  mount(root: TuiNode): void;
  render(): void; // manual mode support
  run(): Promise<void>;
  stop(): Promise<void>;
  state: {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
  };
}
```

## 6. Non-functional Technical Requirements

1. Platform support
- Linux/macOS/Windows terminal compatibility through ANSI abstraction.

2. Dependency policy
- Prefer pure TypeScript/JS dependencies.
- Avoid native bindings in MVP.

3. Performance targets
- Median frame compute under 8ms for <=300 nodes.
- No unnecessary full-screen flush on local state updates.
- Idle loop CPU near zero (event-driven invalidation).

4. Safety requirements
- Guaranteed terminal restoration on normal exit, thrown errors, and signal interruptions.
- Strict cleanup of listeners/timers to prevent leaked handlers between command runs.

5. Accessibility and fallback
- Configurable no-color mode.
- Clear non-TTY behavior (`throw` or `static fallback`).

## 7. Implementation Plan (Phased)

## Phase 0: RFC and package scaffolding
Deliverables:
- New docs RFC finalized and approved
- Package skeletons created

Tasks:
- [ ] Create `packages/tui-core` and `packages/tui` with tsconfig/package metadata.
- [ ] Wire build order in `scripts/build.ts`.
- [ ] Wire root path aliases and package metadata update scripts.

Requirements: R6, R9

## Phase 1: Terminal session + minimal renderer
Deliverables:
- `createApp` with lifecycle management
- Basic retained tree and full-frame render (initially no diff optimization)

Tasks:
- [ ] Implement `TerminalSession` abstraction and `StdTerminalSession`.
- [ ] Implement app lifecycle (`run`, `stop`, signal-safe cleanup).
- [ ] Implement primitive nodes: `text`, `box`, `row`, `column`.
- [ ] Implement layout pass v1 and static frame generation.

Requirements: R1, R2, R4, R10

## Phase 2: Input and focus system
Deliverables:
- Keyboard event parser
- Focus manager and event dispatch

Tasks:
- [ ] Parse raw keyboard sequences into normalized key events.
- [ ] Implement focus graph traversal.
- [ ] Implement propagation model (capture/target/bubble-lite).
- [ ] Expose app-level `onKey` hooks and component handlers.

Requirements: R3, R10

## Phase 3: Core interactive components
Deliverables:
- Input/select/list/scroll components
- Progress/table integration and Markdown/code rendering

Tasks:
- [ ] Build `Input` component (cursor movement, editing, submit/cancel events).
- [ ] Build `Select` component (single-choice keyboard navigation).
- [ ] Build `ScrollBox`/`ScrollView` (vertical scrolling first).
- [ ] Build `Markdown` component for headings/lists/code blocks/inline emphasis.
- [ ] Build `Code` component with configurable wrapping, optional line numbers, and theme tokens.
- [ ] Bridge with `@seedcli/print` style helpers where appropriate.

Requirements: R5, R3, R4

## Phase 4: Seed runtime and umbrella integration
Deliverables:
- `seed.tui` available in commands
- Exclusion behavior consistent with other modules
- Vue reconciler package scaffolded and integrated with core TUI app lifecycle

Tasks:
- [ ] Add module injection in core runtime.
- [ ] Add `Seed` type exposure.
- [ ] Add `@seedcli/seed` re-exports.
- [ ] Add docs/examples for usage.
- [ ] Create `packages/tui-vue` and implement Vue custom renderer host config.
- [ ] Add Vue mount helpers that bind Vue root lifecycle to `tui.createApp()`.
- [ ] Add integration tests for reactive updates and unmount cleanup.

Requirements: R6, R7, R11

## Phase 5: Test harness and optimization pass
Deliverables:
- Deterministic TUI tests in CI
- Incremental frame patching optimization

Tasks:
- [ ] Add `MemoryTerminalSession` for renderer tests.
- [ ] Add snapshot serializer for frame outputs.
- [ ] Add integration tests for terminal cleanup guarantees.
- [ ] Implement incremental diff patching and benchmark suite.

Requirements: R2, R9, R10

## Phase 6: Advanced features and plugin hooks
Deliverables:
- Component registry for plugins

Tasks:
- [ ] Implement plugin-safe component registration API.
- [ ] Document extension APIs and conflict/error handling.

Requirements: R8

## 8. Testing Strategy

Test layers:

1. Unit tests (`packages/tui-core/tests`)
- Layout algorithm correctness
- Diff engine correctness
- Key sequence parser correctness
- Focus traversal behavior

2. Component tests (`packages/tui/tests`)
- Input editing semantics
- Select navigation semantics
- Scroll behavior
- Markdown rendering semantics
- Code block rendering semantics

3. Integration tests (`packages/core/tests`, `packages/testing/tests`)
- `seed.tui` injection
- `.exclude(["tui"])` behavior
- Lifecycle cleanup on throw/signal

4. Benchmark tests
- Frame time baseline and regression checks for representative trees.

## 9. Migration and Backward Compatibility

1. `@seedcli/ui` remains unchanged for existing users.
2. New interactive capabilities live only in `@seedcli/tui` and `@seedcli/tui-vue`.
3. No breaking change to existing command APIs.
4. No planned deprecation or migration path for existing `@seedcli/ui` helpers in this initiative.

## 10. Risks and Mitigations

1. Risk: terminal state corruption on crashes
- Mitigation: centralized session guard with `try/finally` and signal hooks.

2. Risk: flaky tests due terminal-specific behavior
- Mitigation: abstract terminal adapter and deterministic memory terminal in tests.

3. Risk: scope creep from advanced components
- Mitigation: strict phase gates; ship minimal interactive core first.

4. Risk: performance regressions with large trees
- Mitigation: benchmark gate in CI for frame diff and render cost.

## 11. Proposed File/Module Creation Checklist

- `packages/tui-core/src/session/*.ts`
- `packages/tui-core/src/layout/*.ts`
- `packages/tui-core/src/render/*.ts`
- `packages/tui-core/src/input/*.ts`
- `packages/tui/src/app.ts`
- `packages/tui/src/components/*.ts`
- `packages/tui/src/index.ts`
- `packages/tui-vue/src/*.ts`
- `packages/tui-vue/tests/*.test.ts`
- `packages/tui/tests/*.test.ts`
- `packages/tui-core/tests/*.test.ts`
- `seed-docs/content/docs/modules/tui.mdx` (follow-up docs site integration)

## 12. Implementation Inputs

Before coding starts, this plan assumes:

1. Package boundary is fixed: `@seedcli/ui` stays unchanged; new interactive work is in `@seedcli/tui` (+ `@seedcli/tui-vue`).
2. MVP surface: include `Input`, `Select`, `ScrollBox`, `Markdown`, and `Code` in MVP, or reduce scope.
3. Non-TTY policy default: `throw` (recommended for explicitness) or `static fallback`.
