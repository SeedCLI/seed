# Seed CLI TUI Enhanced Requirements

> Companion document to `docs/14-tui-support-plan.md`. This expands the MVP plan with measurable requirements, platform-specific constraints, developer-experience expectations, and a detailed Vue reconciler specification.

## 0. Baseline Assumptions and Quality Gates

### 0.1 Reference Environments

The following environments are the minimum validation matrix for claims in this document:

1. `macOS 14+` with `zsh`, `iTerm2`, and Terminal.app.
2. `Ubuntu 22.04+` with `bash/zsh`, `GNOME Terminal`, `Alacritty`, and `tmux`.
3. `Windows 11` with `PowerShell`, `Windows Terminal` (ConPTY), and Git Bash.

### 0.2 Benchmark Profile (for measurable thresholds)

Unless explicitly stated otherwise, performance thresholds are measured on:

- Node.js `20.x` LTS
- 8+ logical CPU cores
- 16 GB RAM
- Local terminal session (no SSH network latency)
- App size: 300 rendered nodes, 30 focusable nodes, 1 active input source

### 0.3 Common Terms

- `Frame compute`: build layout + compose terminal cell matrix.
- `Flush`: write frame diff to terminal stream.
- `Interactive mode`: raw input active, focus manager running.
- `Degrade mode`: capability-based fallback to reduced behavior.

## 1. Detailed Technical Requirements Enhancement (R1-R11)

Each requirement below extends the original R1-R11 with:

- measurable acceptance criteria
- additional edge cases
- cross-platform specifics
- concurrency and scheduling constraints

### R1. TUI Runtime Lifecycle

#### Enhanced Acceptance Criteria

1. WHEN `app.run()` is called on an interactive TTY THEN session initialization SHALL complete within `100ms` (p95) and transition lifecycle state from `idle -> starting -> running` exactly once.
2. WHEN `alternateScreen=true` THEN the runtime SHALL attempt alternate-screen entry before first render; IF unsupported THEN it SHALL log a debug warning and continue in primary buffer mode.
3. WHEN app exits normally THEN raw mode, cursor visibility, and alternate-screen state SHALL be restored within `50ms` (p95).
4. IF unhandled exceptions or promise rejections occur during runtime THEN terminal restoration SHALL complete before error propagation.
5. WHEN `SIGINT`, `SIGTERM`, or `SIGBREAK` (Windows) is received THEN shutdown SHALL be idempotent and SHALL not execute cleanup handlers more than once.
6. IF `app.stop()` is called multiple times or races with signal shutdown THEN all subsequent calls SHALL resolve without throwing and SHALL return the same shutdown promise.
7. WHEN app run completes THEN total active listeners on `process`, `stdin`, and `stdout` SHALL return to pre-run baseline (no leak delta).

#### Missing Edge Cases

- `run()` called twice without `stop()`.
- terminal detaches mid-session (`EPIPE`, closed stdout).
- `process.exit()` called inside component event.
- signal arrives during flush or layout pass.
- app throws during initialization before first frame.

#### Cross-Platform Specifics

- Unix: handle `SIGWINCH` for resize and standard ANSI control flow.
- Windows ConPTY: support `SIGINT` and `SIGBREAK`; do not assume `SIGTERM` delivery parity.
- Terminal apps that partially support ANSI: detect unsupported modes and downgrade behavior.
- Normalize line endings to avoid `\r\n` corruption in Windows output streams.

#### Concurrency and Scheduling

- Use a lifecycle mutex (`starting`, `running`, `stopping`) to prevent reentrant start/stop.
- Enforce a single writer to terminal stream.
- Serialize shutdown pipeline: `stop input -> stop render loop -> restore terminal -> dispose resources`.
- Signals and explicit `stop()` route through one shared cancellation token.

### R2. Retained Tree Rendering

#### Enhanced Acceptance Criteria

1. WHEN no visual state changes are detected THEN renderer SHALL emit `0` output bytes.
2. WHEN a localized state update occurs in a 300-node tree THEN diffed flush bytes SHALL be `<= 10%` of full-frame bytes (median across benchmark scenarios).
3. WHEN `renderMode="auto"` THEN updates within one event-loop tick SHALL be coalesced into a single render.
4. WHEN `renderMode="manual"` THEN no render SHALL occur unless `app.render()` is called.
5. WHEN terminal resize occurs THEN a re-layout + render SHALL complete within `33ms` (p95) at `30 FPS` cap.
6. WHILE update pressure is high THEN scheduler SHALL guarantee at least one flushed frame every `100ms` to avoid perceived lock-up.
7. WHILE idle THEN renderer SHALL consume `<1%` CPU on reference environments.

#### Missing Edge Cases

- resize event during active diff computation.
- tiny terminal sizes (for example `columns < 10`, `rows < 4`).
- rapid alternating resize events (window drag).
- mixed ANSI-width glyph strings that alter line wrapping.
- large frame patches that exceed output buffer backpressure.

#### Cross-Platform Specifics

- ConPTY behavior may differ for cursor movement and clear-line semantics.
- `tmux`/`screen` can transform control sequences; diff algorithm must tolerate wrapped behavior.
- truecolor/256-color availability influences style diff payload size.

#### Concurrency and Scheduling

- Maintain a monotonic render revision; drop stale render results if a newer revision exists.
- Schedule rendering through one central queue.
- If state changes during flush, enqueue next frame rather than reentering render.
- Apply backpressure-aware writes and await drain events for large flushes.

### R3. Input and Focus

#### Enhanced Acceptance Criteria

1. WHEN interactive mode starts THEN raw input SHALL be enabled once and key parsing SHALL begin within `20ms`.
2. Key dispatch latency from byte arrival to handler invocation SHALL be `<16ms` (p95).
3. WHEN `Tab`/`Shift+Tab` is pressed THEN focus traversal SHALL be deterministic and follow tab order rules.
4. WHEN focused node is removed THEN focus SHALL move to nearest valid fallback target within the same frame.
5. IF an event handler marks event handled THEN propagation SHALL stop unless explicit re-emit is requested.
6. WHEN app stops THEN raw mode SHALL be disabled and parser buffers SHALL be cleared.
7. Bracketed paste mode SHALL be supported and delivered as one paste event payload.

#### Missing Edge Cases

- `ESC` ambiguity: standalone Escape vs Alt-modified sequences.
- IME or multibyte input bursts.
- focus traversal in nested focus scopes.
- key repeat floods on held keys.
- asynchronous event handlers mutating focus target after unmount.

#### Cross-Platform Specifics

- Home/End/Delete sequences differ across terminals and OS.
- Windows ConPTY emits distinct escape sequences for function keys.
- macOS terminals may not expose Command key combinations consistently.
- Ctrl+C behavior in raw mode must preserve explicit interrupt semantics.

#### Concurrency and Scheduling

- Decouple byte parsing from focus dispatch with a bounded event queue.
- Guarantee event order (FIFO) per input stream.
- Prevent reentrant focus mutations during handler execution.
- Apply atomic focus update (`old -> new`) to avoid transient invalid focus.

### R4. Layout Primitives

#### Enhanced Acceptance Criteria

1. Layout pass for a 500-node tree SHALL complete within `4ms` (median) and `8ms` (p95).
2. Width/height constraints (`fixed`, `fill`, `auto`, `min`, `max`) SHALL produce deterministic output independent of insertion order.
3. IF available size is insufficient THEN overflow policy (`clip`, `wrap`, `scroll`) SHALL be applied consistently per container.
4. WHEN terminal is resized THEN full layout invalidation SHALL occur and render result SHALL not contain stale coordinates.
5. Layout engine SHALL support nested row/column containers at depth `>=10` without numeric drift or exceptions.
6. Scroll containers SHALL preserve scroll offset on unrelated sibling updates.

#### Missing Edge Cases

- zero-size containers and negative computed sizes.
- content with mixed full-width and zero-width code points.
- nested scroll regions with independent offsets.
- dynamic content growth while user is at bottom-of-scroll.
- border/padding consuming all available cell area.

#### Cross-Platform Specifics

- Unicode width interpretation varies by terminal font and East Asian width settings.
- PowerShell and ConPTY may differ in wrapping of full-width glyphs.
- `tmux` can alter measured line wrap behavior.

#### Concurrency and Scheduling

- Coalesce repeated layout invalidations into one pass per frame.
- Use dirty-subtree tracking to avoid global recompute for local changes.
- Lock layout snapshot per frame so diff works on stable coordinates.
- Ensure resize-triggered invalidation preempts low-priority visual updates.

### R5. Core Components

#### Enhanced Acceptance Criteria

1. `Input` SHALL support cursor movement, insertion, deletion, home/end, and optional masked mode; editing operations SHALL be reflected within `1 frame`.
2. `Select`/`List` SHALL support keyboard navigation and optional typeahead; with `10,000` items, navigation SHALL remain `<50ms` p95 via virtualization.
3. `ScrollBox` SHALL support vertical scrolling and maintain stable viewport during live content append.
4. `Table` SHALL support fixed and flexible column widths with overflow truncation policies.
5. `Markdown` SHALL parse headings, emphasis, lists, code blocks, inline code, and links in deterministic order.
6. `Code` SHALL support optional line numbers, wrapping modes, and theme tokens.
7. All components SHALL sanitize or encode unsafe ANSI sequences in content payloads by default.

#### Missing Edge Cases

- empty list/select states and null selections.
- very long unbroken strings.
- malformed markdown input.
- invalid UTF-8 in streamed content.
- cursor position persistence after component remount.

#### Cross-Platform Specifics

- paste behavior differs across terminal emulators.
- default fonts affect table alignment for Unicode box drawing characters.
- color fallback for low-capability terminals impacts syntax-highlight output.

#### Concurrency and Scheduling

- component-internal timers (cursor blink, async loading) must route through app scheduler.
- async data updates during user interaction must not reset focus/scroll unexpectedly.
- batched component state updates should trigger single render invalidation.

### R6. Seed Runtime Integration

#### Enhanced Acceptance Criteria

1. `seed.tui` typing SHALL resolve in editor IntelliSense with no additional user type augmentation.
2. `.exclude(["tui"])` SHALL throw identical excluded-module error shape as existing Seed modules.
3. Importing from `@seedcli/seed` SHALL expose `tui` APIs and types with stable module paths.
4. Commands not using `tui` SHALL not incur TUI runtime startup cost (lazy-load verified by integration test).
5. Module load overhead for first `tui` access SHALL be `<30ms` (p95) on reference environments.

#### Missing Edge Cases

- mixed ESM/CJS consumers.
- duplicate `@seedcli/tui` versions in monorepo/workspace edge setups.
- excluded module accessed indirectly through helper wrapper.

#### Cross-Platform Specifics

- Windows path resolution and package exports conditions.
- shell-specific command launch behavior influencing `stdin` mode.

#### Concurrency and Scheduling

- isolated `seed` runtime instances SHALL not share mutable global TUI state.
- parallel command invocations in tests SHALL not leak registries.
- dynamic imports must be deduplicated safely and cached by runtime.

### R7. Non-interactive and Capability-Based Fallback

#### Enhanced Acceptance Criteria

1. Capability detection SHALL evaluate `stdin.isTTY`, `stdout.isTTY`, color depth, and control-sequence support before entering interactive mode.
2. IF mode is non-interactive and `fallback="throw"` THEN error message SHALL include explicit remediation (`--no-tui`, `fallback: "static"`, or environment hints).
3. IF `fallback="static"` THEN static render SHALL complete within `100ms` for baseline app size.
4. IF color is unsupported or `NO_COLOR` is set THEN output SHALL disable color while preserving textual semantics.
5. IF TTY capability is partially available THEN runtime SHALL select `reduced` mode (interactive without unsupported features) rather than hard fail.

#### Missing Edge Cases

- CI environments exposing pseudo-TTY with limited control support.
- stdout piped while stderr remains TTY.
- loss of TTY mid-run (SSH drop).
- user-forced capability overrides conflicting with auto-detection.

#### Cross-Platform Specifics

- Windows Terminal vs legacy console behavior.
- WSL + Windows host combinations.
- `TERM`, `COLORTERM`, and ConPTY metadata differences.

#### Concurrency and Scheduling

- fallback decision must happen once before session start and be immutable unless TTY is lost.
- if TTY becomes unavailable during run, switch to degrade mode via one-way state transition.
- do not keep input loop active in static mode.

### R8. Extensibility

#### Enhanced Acceptance Criteria

1. Plugin API SHALL expose typed registration for components, keymaps, and render hooks.
2. Component registration SHALL be namespaced (`vendor/component`) and conflict detection SHALL be deterministic.
3. Plugin registration failures SHALL include plugin id, conflicting symbol, and remediation text.
4. Plugin-provided components SHALL run through same lifecycle cleanup contract as core components.
5. API compatibility checks SHALL reject plugins requiring newer major host API versions.

#### Missing Edge Cases

- plugin throws during render/update/unmount.
- transitive plugin dependency conflicts.
- duplicate plugin load attempts.
- plugin registers component after app has started.

#### Cross-Platform Specifics

- plugin path and module resolution differences on Windows.
- ESM-only plugin loading behavior in mixed environments.

#### Concurrency and Scheduling

- registry writes must be atomic at startup.
- runtime plugin hot-registration must be serialized and emit consistent snapshot for subsequent renders.
- extension hooks must not block render loop; long hooks require async boundary and timeout warnings.

### R9. Testability

#### Enhanced Acceptance Criteria

1. `MemoryTerminalSession` SHALL emulate size, input, resize, and write stream deterministically.
2. Snapshot serializer SHALL normalize line endings and timing metadata across OSes.
3. Input simulation SHALL support raw escape sequences, bracketed paste, and resize events.
4. CI SHALL run cross-platform tests (`linux`, `macos`, `windows`) for core parser and lifecycle suites.
5. Test harness SHALL expose virtual clock controls for deterministic timer/cursor-blink tests.
6. Flake rate target for TUI CI suites SHALL be `<0.5%` over 30 consecutive runs.

#### Missing Edge Cases

- signal arrival during teardown.
- concurrent input + resize fuzz scenarios.
- rapid mount/unmount loops causing listener leaks.
- test snapshot brittleness from nondeterministic object iteration.

#### Cross-Platform Specifics

- Windows-specific escape sequence fixtures.
- differing default codepages and unicode normalization.
- shell-specific behavior in CI runners.

#### Concurrency and Scheduling

- provide fuzz tests that interleave state updates, input events, and resizes.
- ensure virtual scheduler executes deterministic order (`input -> state -> layout -> render`).
- snapshot assertions should occur only after render queue drains.

### R10. Performance and Stability

#### Enhanced Acceptance Criteria

1. For <=300 nodes, frame compute SHALL be `<8ms` median and `<16ms` p95.
2. For <=1000 nodes, frame compute SHALL remain `<25ms` p95.
3. Idle CPU SHALL remain `<1%` with no active input or timers.
4. Long-run memory drift after 60 minutes idle + interaction mix SHALL be `<10MB`.
5. Under sustained input (`100 key events/sec`), dropped input events SHALL be `0` and renderer MAY drop intermediate frames but SHALL preserve latest state.
6. On fatal runtime error, terminal restoration success rate SHALL be `100%` in integration tests.

#### Missing Edge Cases

- high-frequency resize storms.
- massive list scrolling with live data append.
- output backpressure from slow terminals/remote sessions.
- runaway timer creation by user code.

#### Cross-Platform Specifics

- performance baselines differ in ConPTY vs Unix PTY; thresholds should be tracked separately where needed.
- remote terminals over SSH can increase flush latency; scheduler should adapt.

#### Concurrency and Scheduling

- separate "state revision" from "paint revision" to avoid lock-step contention.
- bounded render queue with coalescing to latest revision.
- explicit backpressure handling on output stream drain.
- watchdog in dev mode to detect blocked event loop (>200ms stalls).

### R11. Vue Reconciler Package (`@seedcli/tui-vue`)

#### Enhanced Acceptance Criteria

1. Vue custom renderer SHALL support standard Vue component composition (`props`, `slots`, `emits`, `provide/inject`, `watch`, `computed`).
2. Reactive updates SHALL propagate to TUI nodes without full remount; p95 update-to-flush latency SHALL be `<20ms` for 500 rendered host nodes.
3. Component unmount SHALL remove all associated TUI event handlers, timers, and subscriptions in the same flush cycle.
4. IF app lifecycle stops THEN mounted Vue root SHALL unmount exactly once and release effects/listeners.
5. Focus SHALL remain stable across keyed list updates when keys are preserved.
6. Unsupported Vue features (if any) SHALL fail with explicit runtime warnings and docs references.

#### Missing Edge Cases

- async setup + suspense-like loading in terminal context.
- errors thrown in `watchEffect` during render.
- teleport-like patterns that do not map cleanly to terminal tree.
- hot reload with preserved local state.

#### Cross-Platform Specifics

- renderer output correctness depends on core terminal capability layer; tests must include Windows ConPTY fixtures.
- ensure Unicode width correctness in Vue-rendered text nodes.

#### Concurrency and Scheduling

- bridge Vue scheduler flushes into TUI scheduler without recursive render loops.
- maintain one-way pipeline: `Vue job queue -> host patch -> TUI invalidation -> render`.
- concurrent reactive updates shall be batched into one frame when in same microtask.

## 2. Customer and Developer Perspective

### 2.1 Developer Personas

1. `CLI Tool Author`:
   Builds command-centric tools and wants interactive prompts, tables, and workflows without writing low-level terminal control code.

2. `DevOps Dashboard Builder`:
   Needs real-time status panels (deployments, logs, incidents) with low-latency updates and robust keyboard navigation.

3. `Platform Team Engineer`:
   Maintains internal developer tooling; needs strong typing, plugin capability, deterministic tests, and stable APIs.

4. `Workflow/Productivity Builder`:
   Creates git-like or file-manager-like terminal apps where focus behavior, list virtualization, and discoverable shortcuts matter.

5. `Plugin Ecosystem Contributor`:
   Wants to publish reusable TUI widgets and expects extension APIs, versioning, conflict handling, and compatibility guarantees.

### 2.2 Developer Journey Map

| Stage | Developer Goal | Typical Friction in Current Ecosystem | Seed TUI Requirement |
|---|---|---|---|
| 1. First run | Install and render "Hello TUI" | Boilerplate around terminal session and cleanup | `createApp()` one-call lifecycle defaults, safe cleanup |
| 2. Basic interaction | Add keyboard navigation and input | Manual key parsing and focus logic | Built-in parser + focus manager + Input/List components |
| 3. Real data | Bind async API data to UI | Re-render churn, race conditions | Scheduler batching, state patterns, async-safe components |
| 4. Complex layout | Build dashboards/forms with resizable panes | Fragile manual layout and clipping bugs | Deterministic row/column layout + overflow policies |
| 5. Production hardening | Handle CI/non-TTY/partial capability cases | Inconsistent fallback behavior | Capability detection + degrade profiles |
| 6. Debug and test | Reproduce input/render bugs | Hard-to-test terminal behavior | Memory terminal, deterministic snapshots, debug overlay |
| 7. Scale and extend | Add plugins and custom components | Undocumented extension hooks | Typed registry + versioned extension contracts |

### 2.3 Pain Points in Existing Frameworks to Avoid

#### Ink (React)

- Pain: React mental model is familiar, but terminal-specific debugging and layout diagnostics are limited.
- Pain: render churn can be hard to reason about without instrumentation.
- Avoidance target: built-in frame/debug inspector, per-component render stats, capability-aware warnings.

#### Blessed (Node imperative)

- Pain: imperative mutation-heavy APIs become brittle in large apps.
- Pain: aging ecosystem and inconsistent TypeScript support.
- Avoidance target: declarative typed API with deterministic reconciliation and modern TS-first docs.

#### Bubble Tea (Go, TEA architecture)

- Pain: deterministic architecture is strong but can be verbose for typical UI composition.
- Pain: component reuse is less ergonomic in JS/TS ecosystems.
- Avoidance target: declarative component tree + optional explicit state machine pattern (without forcing TEA).

#### Textual (Python)

- Pain: strong framework but Python runtime and packaging are mismatched for Node-first CLI teams.
- Pain: async/event orchestration can become complex without guardrails.
- Avoidance target: Node-native toolchain, typed async boundaries, and first-class cancellation.

### 2.4 DX Requirements

#### Error Messages

1. Every runtime error SHALL include a stable code (`SEED_TUI_xxxx`).
2. Errors SHALL include component path (if available), cause, and remediation.
3. Capability errors SHALL include detected capability matrix and override flags.

#### Debugging Tools

1. Provide `dev` mode with optional on-screen debug overlay (`fps`, dirty nodes, focus target, event queue depth).
2. Provide event tracing hooks for `input`, `focus`, `layout`, and `render` phases.
3. Provide frame snapshot export command for bug reports.

#### Hot Reload

1. In dev mode, file change reload SHALL target `<700ms` (p95) round trip for moderate apps.
2. Support two modes: `preserve-state` and `full-restart`.
3. On hot-reload failure, runtime SHALL keep last stable frame and print actionable diagnostics.

#### Dev Mode Guardrails

1. Warn on long synchronous handlers (`>16ms`).
2. Warn on listener/timer leaks at app shutdown.
3. Warn when frame budget is consistently exceeded (`>20%` of frames over budget in 10s window).

### 2.5 API Ergonomics: Ideal Balance vs Ink/Bubbletea/Textual

| Dimension | Ink (React) | Bubble Tea (Elm/TEA) | Textual (Python) | Seed TUI Ideal |
|---|---|---|---|---|
| Mental model | Declarative React tree | Message-update-view loop | Widget + CSS-like styling | Declarative tree with optional explicit update loop |
| Typing in TS ecosystem | Good | N/A (Go) | N/A (Python) | TS-first, strongly typed components and events |
| State model | Hooks + React state | Central model/update determinism | Reactive Python widgets | Local component state + app store + optional FSM helpers |
| Layout ergonomics | Basic flex-like abstractions | Manual-ish composition | Strong layout/styling primitives | Deterministic row/column primitives + theme tokens |
| Debuggability | Limited built-in terminal tooling | Deterministic but Go-specific | Rich dev tools in Python context | Built-in terminal diagnostics + frame trace + capability report |
| Escape hatches | Custom hooks/components | Custom commands/messages | Widget extension | Typed plugin registries + low-level node APIs |

Principle: Seed should keep the default path simple (declarative components), but preserve explicit control for power users (manual render mode, explicit scheduler hooks, and optional state-machine patterns).

## 3. Missing Technical Considerations (Expanded)

### 3.1 Accessibility

1. Provide high-contrast theme tokens and guaranteed minimum contrast policy for color-capable terminals.
2. Ensure all interactions are keyboard accessible with discoverable shortcut help (`?` overlay by convention).
3. Provide an `accessibility.mode` with at least `auto`, `on`, `off`.
4. In accessibility mode, provide optional "linearized output" stream for screen-reader-friendly content.
5. Avoid color-only semantics; status indicators must include symbol/text equivalents.

### 3.2 Internationalization and Text Handling

1. Use grapheme-aware string operations to avoid splitting combining characters or emoji sequences.
2. Use Unicode width calculation with configurable East Asian ambiguous width policy.
3. Provide RTL-aware text alignment modes and document limitations for bidi mixing.
4. Support UTF-8 multibyte input and paste payloads.
5. Ensure cursor movement is grapheme-based, not UTF-16 code-unit-based.

### 3.3 Terminal Capability Detection

1. Detect color depth (`none`, `16`, `256`, `truecolor`) and expose via runtime API.
2. Detect mouse tracking capability and expose feature flags.
3. Respect standard env conventions: `NO_COLOR`, `TERM`, `COLORTERM`, CI markers.
4. Support user overrides (`--color=always/never`, `--tui-capabilities=<profile>`).
5. Emit a capability report in debug mode for issue triage.

### 3.4 Memory Management and Leak Prevention

1. Introduce strict disposal contracts for components and app-level resources.
2. Track listener/timer/subscription counts in dev mode and emit shutdown leak summary.
3. Use bounded buffers for logs/events to prevent unbounded growth.
4. Define soft memory budgets for common component types (for example virtualized list caches).
5. Add long-run soak tests (>=2 hours) to detect heap growth regressions.

### 3.5 Graceful Degradation Strategy (Beyond Throw/Static)

Define runtime operation profiles:

1. `full`: full interactive + color + advanced controls.
2. `reduced`: interactive but limited visuals/capabilities.
3. `static`: one-shot summary view.
4. `stream`: line-oriented updates for piped environments.
5. `plain`: no ANSI control sequences, pure text.

Requirements:

- profile selection SHOULD be automatic with override support.
- profile should be exposed to app code so components can adapt behavior.
- profile transitions should be one-way under failure (for safety).

### 3.6 Animation and Transition System

1. Provide optional animation scheduler with FPS cap (default `30`).
2. Support simple transitions (`enter`, `exit`, `value tween`) with interruption handling.
3. Honor reduced-motion setting in environment/config (`animations=off`).
4. Avoid animation-induced layout thrash by precomputing target layouts.
5. Keep animation disabled by default in non-interactive profiles.

### 3.7 State Management Patterns

Beyond key-value store, provide optional patterns:

1. `atom/signal-style` local reactive state.
2. `global store` with selectors and derived values.
3. `event reducer` pattern for deterministic state transitions.
4. `state machine` integration points for multi-step workflows.
5. `async resource` abstraction for loading/error/data states with cancellation.

### 3.8 Theming System Details

1. Theme tokens SHOULD be semantic (`surface`, `textPrimary`, `warning`, `focusRing`) not raw colors.
2. Support theme inheritance and component-level overrides.
3. Support at least `light`, `dark`, and user-defined custom themes.
4. Allow runtime theme switching without remount.
5. Theme engine SHALL adapt tokens to terminal capability depth (truecolor -> 256 -> 16 -> no color).

## 4. Enhanced User Stories (Real-World Scenarios)

### 4.1 Git-like Interactive Rebase UI

**User Story:** As a developer, I want an interactive rebase editor in terminal so I can reorder, squash, drop, and edit commits safely without manual todo-file editing.

#### Acceptance Criteria

1. WHEN UI loads a commit list THEN it SHALL render first interactive frame within `300ms` for `<=1000` commits.
2. WHEN user presses move keys THEN selected commit SHALL reorder without full list rerender.
3. WHEN action (`pick`, `squash`, `drop`, `reword`) changes THEN row state SHALL update and remain keyboard focusable.
4. IF user attempts to exit with unsaved changes THEN confirmation dialog SHALL be shown.
5. WHEN user confirms apply THEN generated rebase todo SHALL be previewable before write.
6. IF write fails (permissions or lock) THEN error SHALL include cause and retry path.
7. WHERE conflicts are detected from downstream operation THEN UI SHALL switch to conflict guidance mode.

### 4.2 Kubernetes Dashboard

**User Story:** As an SRE, I want a live terminal dashboard for cluster workloads so I can monitor status and drill into failing resources quickly.

#### Acceptance Criteria

1. WHEN dashboard starts THEN cluster summary widgets SHALL render within `500ms` after initial API response.
2. WHILE watch stream is active THEN updates SHALL batch to max `5` renders/sec to avoid churn.
3. WHEN selected resource changes THEN details pane SHALL update while preserving list scroll position.
4. IF API latency exceeds threshold (for example `>3s`) THEN stale data indicator SHALL be visible.
5. IF watch connection drops THEN UI SHALL auto-retry with exponential backoff and visible retry state.
6. WHERE resource list size exceeds viewport THEN virtualization SHALL keep scroll interactions `<60ms` p95.
7. WHEN user filters namespace/kind THEN filter response SHALL appear within `200ms` for `<=5000` resources.

### 4.3 Interactive Form Wizard

**User Story:** As a platform user, I want a multi-step form wizard in terminal so I can configure infrastructure templates with validation and progress guidance.

#### Acceptance Criteria

1. WHEN wizard starts THEN step 1 fields SHALL receive initial focus automatically.
2. WHEN user submits a step THEN synchronous validation SHALL run before navigation.
3. IF asynchronous validation is required (for example API uniqueness check) THEN step SHALL show loading state and remain cancelable.
4. WHERE fields are conditional THEN visibility and requiredness SHALL update from previous answers deterministically.
5. WHEN user navigates backward THEN previously entered values SHALL persist.
6. IF field type is secret THEN value SHALL be masked and excluded from debug traces by default.
7. WHEN wizard completes THEN static summary SHALL be available for non-interactive export.

### 4.4 Log Viewer with Filtering

**User Story:** As an engineer, I want an interactive log viewer so I can tail, filter, and inspect large log streams without losing responsiveness.

#### Acceptance Criteria

1. WHILE ingesting logs at `50,000 lines/min` THEN UI SHALL remain interactive with bounded memory via ring buffer.
2. WHEN regex filter changes THEN filtered viewport SHALL update within `250ms` for in-memory buffer of `100,000` lines.
3. WHEN paused mode is enabled THEN ingest SHALL continue to buffer without moving viewport.
4. WHEN resumed THEN viewport SHALL optionally jump to latest based on user setting.
5. IF regex is invalid THEN parser error SHALL be inline and non-fatal.
6. WHERE severity highlighting is enabled THEN colors SHALL degrade gracefully on low-color terminals.
7. WHEN exporting visible logs THEN output SHALL exclude ANSI decorations unless explicitly requested.

### 4.5 File Manager

**User Story:** As a developer, I want a keyboard-driven file manager in terminal so I can browse, preview, and perform file operations quickly.

#### Acceptance Criteria

1. WHEN opening a directory with `<=20,000` entries THEN initial list SHALL be interactive within `400ms` using incremental loading.
2. WHEN moving selection THEN preview pane SHALL update without losing list position.
3. WHEN executing copy/move/delete/rename THEN operation SHALL show progress and completion/failure status.
4. IF operation requires confirmation (delete overwrite) THEN modal prompt SHALL trap focus until resolved.
5. IF permission errors occur THEN failure details SHALL show file path and system error code.
6. WHERE symlink entries exist THEN UI SHALL display link target and support safe navigation behavior.
7. WHEN terminal resizes THEN pane proportions SHALL recompute and preserve active focus target.

## 5. Vue Reconciler Deep Dive (`@seedcli/tui-vue`)

### 5.1 Goals and Non-goals

#### Goals

1. Let Vue developers author TUI using familiar component patterns.
2. Map Vue VDOM updates efficiently to Seed TUI retained node tree.
3. Maintain deterministic lifecycle and resource cleanup.
4. Preserve performance under frequent reactive updates.

#### Non-goals (MVP)

1. Browser-like DOM feature parity.
2. Arbitrary Teleport targets outside TUI app root.
3. Full animation framework in renderer itself (delegated to TUI core scheduler).

### 5.2 Architecture Overview

`@seedcli/tui-vue` should expose:

```ts
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

Runtime stack:

1. Vue runtime creates VNodes.
2. Custom host config maps VNode operations into TUI node mutations.
3. Mutations invalidate TUI app render state.
4. TUI scheduler computes layout + diff + flush.

### 5.3 Host Node Model

Renderer host node types:

1. `TuiElementNode`: mutable node for containers/components (`box`, `row`, `column`, `input`, and so on).
2. `TuiTextNode`: leaf text node with grapheme-aware content.
3. `TuiRootNode`: bridge root between Vue tree and `TuiApp` mount target.

Each host node stores:

- node id/reference
- parent/children links
- pending prop updates
- event subscriptions and cleanup hooks
- optional focus metadata

### 5.4 Vue Host Config Specification

Key host operations and behavior:

1. `createElement(type, isSVG, is, props)`:
   Create `TuiElementNode` from type registry and normalize props.
2. `createText(text)`:
   Create `TuiTextNode` with normalized grapheme-safe string.
3. `insert(child, parent, anchor)`:
   Insert node in deterministic index order and mark affected subtree dirty.
4. `remove(child)`:
   Unsubscribe events, dispose node resources, detach from parent.
5. `patchProp(el, key, prev, next)`:
   Validate prop transitions, apply normalized update, mark minimal dirty scope.
6. `setElementText(el, text)` and `setText(node, text)`:
   Update content without remounting siblings.
7. `parentNode(node)` and `nextSibling(node)`:
   Required for Vue diff traversal.
8. `flushPostFlushCbs` integration:
   Forward Vue post-flush effects to TUI scheduler boundary safely.

### 5.5 Reactivity to TUI Update Pipeline

Pipeline contract:

1. Vue reactivity marks component effects dirty.
2. Vue scheduler batches updates in microtask queue.
3. Host patch operations mutate TUI retained tree.
4. Mutations call `app.invalidate(subtreeId, reason)`.
5. TUI render scheduler coalesces invalidations and runs layout+diff.
6. Renderer flushes patch to terminal stream.

Rules:

- No direct terminal writes from host config.
- All writes must pass through core TUI scheduler.
- Multiple Vue effects in same tick should produce one TUI frame when possible.

### 5.6 Lifecycle Mapping (Vue -> TUI)

| Vue Lifecycle | TUI Lifecycle Mapping |
|---|---|
| `setup` | allocate node context, bind store/event dependencies |
| `onBeforeMount` | create host nodes, stage initial props |
| `onMounted` | attach focus handlers and side-effect subscriptions |
| `onBeforeUpdate` | snapshot mutable cursor/focus-sensitive state if needed |
| `onUpdated` | revalidate focus and scroll anchors if structure changed |
| `onBeforeUnmount` | unregister input handlers, cancel timers/watchers |
| `onUnmounted` | detach nodes, release memory, remove from registry |
| `onErrorCaptured` | route to app error handler and optionally render fallback UI |

### 5.7 Performance Considerations for Terminal Context

1. Prefer patch-flag-aware prop updates to avoid broad invalidation.
2. Use static hoisting for immutable subtrees to reduce repeated host operations.
3. Cache measured text widths by `(string, style, widthPolicy)` for current frame generation window.
4. Preserve stable keys for lists to avoid focus reset and remount churn.
5. Avoid creating intermediate strings for full-frame output when diff patch can be emitted.
6. Apply frame budget control (`fpsCap`) and drop obsolete intermediate paint revisions.

### 5.8 Error Boundaries and Recovery

1. Component-level errors should map to Vue `errorCaptured` and optional fallback component rendering.
2. Unhandled renderer errors should trigger app-safe shutdown path (restore terminal first).
3. In dev mode, include component trace and last input event in diagnostics.

### 5.9 Comparison with Ink's React Reconciler

| Area | Ink (React reconciler) | Seed Vue Reconciler Target |
|---|---|---|
| Reactive model | React state/hooks and concurrent rendering semantics | Vue reactivity with explicit scheduler bridge to TUI frame loop |
| Update granularity | Fiber-based reconciliation | Vue patch flags + retained TUI dirty-subtree invalidation |
| Scheduling control | React scheduler decisions | Explicit TUI frame scheduler with FPS/backpressure policies |
| Lifecycle cleanup | React effect cleanup | Vue lifecycle + strict TUI resource disposal contract |
| Focus/state preservation | Depends on key stability and component patterns | Key-stable updates plus explicit focus manager integration |
| Dev diagnostics | Ecosystem-dependent tooling | Built-in TUI diagnostics (frame, focus, capability, queue depth) |

Design intent: keep Vue authoring ergonomics, but enforce TUI-core scheduling invariants so terminal output remains deterministic and safe.

## 6. Recommended Additions to the Existing Plan

1. Add a dedicated "Capability and Degradation" phase after current Phase 1.
2. Add explicit accessibility/i18n acceptance tests before Phase 4 completion.
3. Add long-run soak tests and leak gates before marking Phase 5 done.
4. Expand Phase 4 deliverables with Vue scheduler integration tests and lifecycle mapping conformance tests.
5. Add developer tooling deliverables (`dev overlay`, `trace export`, `capability report`) to improve adoption and debugging.
