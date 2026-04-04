// ─── Signal ───

/** A subscriber callback that receives the new value. */
type Subscriber<T> = (value: T) => void;

/**
 * Create a reactive signal — a simple getter/setter pair with subscriber
 * notification. When the value changes, all subscribers are called
 * synchronously.
 *
 * @returns A tuple `[get, set]` where `get` reads the current value and
 * `set` writes a new value, notifying subscribers if the value changed.
 */
export function createSignal<T>(initialValue: T): [get: () => T, set: (value: T) => void] {
	let value = initialValue;
	const subscribers = new Set<Subscriber<T>>();

	function get(): T {
		return value;
	}

	function set(newValue: T): void {
		if (Object.is(value, newValue)) return;
		value = newValue;
		for (const cb of subscribers) {
			cb(value);
		}
	}

	// Attach subscription API to the getter for internal use
	(get as SignalGetter<T>)._subscribe = (cb: Subscriber<T>): (() => void) => {
		subscribers.add(cb);
		return () => {
			subscribers.delete(cb);
		};
	};

	return [get, set];
}

/**
 * Internal interface: signal getters carry a hidden `_subscribe` method
 * so that computed values and effects can wire up subscriptions.
 */
interface SignalGetter<T> {
	(): T;
	_subscribe?(cb: Subscriber<T>): () => void;
}

/**
 * Helper to subscribe to a dependency. If the dep is a signal getter
 * (with `_subscribe`), use that. Otherwise we fall back to polling on
 * each evaluation — but in practice all deps from `createSignal` and
 * `createComputed` carry `_subscribe`.
 */
function subscribeToDep(dep: () => unknown, cb: () => void): () => void {
	const signalDep = dep as SignalGetter<unknown>;
	if (typeof signalDep._subscribe === "function") {
		return signalDep._subscribe(cb);
	}
	// For non-signal deps, we cannot subscribe — return a no-op cleanup.
	// Effects/computed that use these will only update when another dep triggers.
	return () => {};
}

// ─── Computed ───

/**
 * Create a computed (derived) value that recomputes automatically when
 * any of its dependencies change.
 *
 * @param fn - A function that computes the derived value.
 * @param deps - An array of signal/computed getters this value depends on.
 * @returns A getter function that always returns the latest computed value.
 */
export function createComputed<T>(fn: () => T, deps: Array<() => unknown>): () => T {
	let value: T = fn();
	let dirty = false;
	const subscribers = new Set<Subscriber<T>>();

	function recompute(): void {
		const newValue = fn();
		if (!Object.is(value, newValue)) {
			value = newValue;
			for (const cb of subscribers) {
				cb(value);
			}
		}
		dirty = false;
	}

	// Subscribe to all dependencies
	const cleanups: Array<() => void> = [];
	for (const dep of deps) {
		const cleanup = subscribeToDep(dep, () => {
			if (!dirty) {
				dirty = true;
				// Recompute synchronously so the value is always fresh
				recompute();
			}
		});
		cleanups.push(cleanup);
	}

	function get(): T {
		// If dirty from a non-subscribable dep change, recompute lazily
		if (dirty) {
			recompute();
		}
		return value;
	}

	// Expose _subscribe so this computed can itself be a dependency
	(get as SignalGetter<T>)._subscribe = (cb: Subscriber<T>): (() => void) => {
		subscribers.add(cb);
		return () => {
			subscribers.delete(cb);
		};
	};

	// Expose a dispose helper on the getter for cleanup
	(get as ComputedGetter<T>)._dispose = (): void => {
		for (const cleanup of cleanups) {
			cleanup();
		}
		cleanups.length = 0;
		subscribers.clear();
	};

	return get;
}

interface ComputedGetter<T> extends SignalGetter<T> {
	_dispose?(): void;
}

// ─── Effect ───

/**
 * Create a reactive effect that runs whenever its dependencies change.
 *
 * The effect function may optionally return a cleanup function that is
 * invoked before each re-run and on final disposal.
 *
 * @param fn - The effect function. May return a cleanup function.
 * @param deps - An array of signal/computed getters this effect depends on.
 * @returns A dispose function that stops the effect and runs final cleanup.
 */
export function createEffect(
	fn: () => undefined | (() => void),
	deps: Array<() => unknown>,
): () => void {
	let cleanupFn: (() => void) | undefined;
	let disposed = false;

	function run(): void {
		if (disposed) return;
		// Run previous cleanup before re-executing
		if (typeof cleanupFn === "function") {
			cleanupFn();
		}
		cleanupFn = fn();
	}

	// Run the effect immediately
	run();

	// Subscribe to all dependencies
	const depCleanups: Array<() => void> = [];
	for (const dep of deps) {
		const cleanup = subscribeToDep(dep, () => {
			run();
		});
		depCleanups.push(cleanup);
	}

	// Return a dispose function
	return (): void => {
		if (disposed) return;
		disposed = true;

		// Unsubscribe from deps
		for (const cleanup of depCleanups) {
			cleanup();
		}
		depCleanups.length = 0;

		// Run final cleanup
		if (typeof cleanupFn === "function") {
			cleanupFn();
			cleanupFn = undefined;
		}
	};
}

// ─── Store ───

/**
 * A reactive key-value store. Each key can be independently subscribed to.
 * Provides `get`, `set`, `subscribe`, and `snapshot` operations.
 */
export interface Store<T extends Record<string, unknown>> {
	/** Get the current value for a key. */
	get<K extends keyof T>(key: K): T[K];
	/** Set a value for a key, notifying subscribers of that key. */
	set<K extends keyof T>(key: K, value: T[K]): void;
	/** Subscribe to changes on a specific key. Returns an unsubscribe function. */
	subscribe<K extends keyof T>(key: K, cb: (value: T[K]) => void): () => void;
	/** Return a shallow snapshot of the entire store state. */
	snapshot(): T;
}

/**
 * Create a reactive key-value store with per-key subscriptions.
 *
 * @param initial - The initial state object.
 * @returns A `Store` with `get`, `set`, `subscribe`, and `snapshot` methods.
 */
export function createStore<T extends Record<string, unknown>>(initial: T): Store<T> {
	// Internal mutable copy of state
	const state: Record<string, unknown> = { ...initial };
	// Per-key subscriber sets
	const subscribers = new Map<string, Set<(value: unknown) => void>>();

	return {
		get<K extends keyof T>(key: K): T[K] {
			return state[key as string] as T[K];
		},

		set<K extends keyof T>(key: K, value: T[K]): void {
			const strKey = key as string;
			if (Object.is(state[strKey], value)) return;

			state[strKey] = value;

			const subs = subscribers.get(strKey);
			if (subs) {
				for (const cb of subs) {
					cb(value);
				}
			}
		},

		subscribe<K extends keyof T>(key: K, cb: (value: T[K]) => void): () => void {
			const strKey = key as string;
			let subs = subscribers.get(strKey);
			if (!subs) {
				subs = new Set();
				subscribers.set(strKey, subs);
			}
			subs.add(cb as (value: unknown) => void);

			return () => {
				const currentSubs = subscribers.get(strKey);
				if (currentSubs) {
					currentSubs.delete(cb as (value: unknown) => void);
					if (currentSubs.size === 0) {
						subscribers.delete(strKey);
					}
				}
			};
		},

		snapshot(): T {
			return { ...state } as T;
		},
	};
}

// ─── Async Resource ───

/**
 * An async resource that manages loading, error, and data states for
 * an asynchronous data fetcher.
 */
export interface AsyncResource<T> {
	/** The fetched data, or `undefined` if not yet loaded. */
	data: () => T | undefined;
	/** The error, or `undefined` if no error occurred. */
	error: () => Error | undefined;
	/** Whether the resource is currently loading. */
	loading: () => boolean;
	/** Re-execute the fetcher, resetting the loading state. */
	refetch: () => void;
}

/**
 * Create an async resource that wraps a `Promise`-returning fetcher
 * with reactive `data`, `error`, and `loading` signals.
 *
 * The fetcher is invoked immediately upon creation and can be
 * re-invoked via the returned `refetch` method.
 *
 * @param fetcher - An async function that returns the data.
 * @returns An `AsyncResource` with reactive getters and `refetch`.
 */
export function createAsyncResource<T>(fetcher: () => Promise<T>): AsyncResource<T> {
	const [data, setData] = createSignal<T | undefined>(undefined);
	const [error, setError] = createSignal<Error | undefined>(undefined);
	const [loading, setLoading] = createSignal<boolean>(true);

	// Track the current fetch generation to discard stale responses
	let generation = 0;

	function doFetch(): void {
		const currentGen = ++generation;
		setLoading(true);
		setError(undefined);

		fetcher().then(
			(result) => {
				// Only apply if this is still the latest fetch
				if (currentGen !== generation) return;
				setData(result);
				setLoading(false);
			},
			(err) => {
				if (currentGen !== generation) return;
				setError(err instanceof Error ? err : new Error(String(err)));
				setLoading(false);
			},
		);
	}

	// Start the initial fetch
	doFetch();

	return {
		data,
		error,
		loading,
		refetch: doFetch,
	};
}
