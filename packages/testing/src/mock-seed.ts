import type { Seed } from "@seedcli/core";

export interface MockSeedOptions {
	args?: Record<string, unknown>;
	flags?: Record<string, unknown>;
	commandName?: string;
	brand?: string;
	version?: string;
}

/**
 * Create a mock Seed context with sensible defaults for testing commands
 * in isolation without needing a full Runtime.
 *
 * All module methods are no-ops by default; override specific properties
 * after creation when you need to spy on or customise behaviour.
 *
 * @example
 * ```ts
 * const seed = mockSeed({
 *   args: { name: "hello" },
 *   flags: { verbose: true },
 * });
 * await myCommand.run(seed);
 * ```
 */
export function mockSeed(
	options: MockSeedOptions = {},
): Seed<Record<string, unknown>, Record<string, unknown>> {
	const {
		args = {},
		flags = {},
		commandName = "test",
		brand = "test-cli",
		version = "0.0.0",
	} = options;

	const noopSpinner = {
		text: "",
		succeed: () => {},
		fail: () => {},
		warn: () => {},
		info: () => {},
		stop: () => {},
		isSpinning: false,
	};

	const noopProgressBar = {
		update: () => "",
		done: () => "",
	};

	return {
		args,
		flags,
		parameters: {
			raw: [],
			argv: Object.values(args).map(String),
			command: commandName,
		},
		meta: {
			version,
			commandName,
			brand,
			debug: false,
		},

		// ── Print (no-op) ──
		print: {
			info: () => {},
			success: () => {},
			warning: () => {},
			error: () => {},
			debug: () => {},
			highlight: () => {},
			muted: () => {},
			newline: () => {},
			colors: new Proxy({} as never, {
				get: () => (str: string) => str,
			}),
			spin: () => ({ ...noopSpinner }),
			table: () => {},
			box: () => {},
			ascii: () => {},
			tree: () => {},
			keyValue: () => {},
			divider: () => {},
			progressBar: () => ({ ...noopProgressBar }),
			columns: () => "",
			indent: (text: string) => text,
			wrap: (text: string) => text,
		},

		// ── Prompt (returns empty / first-option defaults) ──
		prompt: new Proxy({} as never, {
			get: () => () => Promise.resolve(""),
		}),

		// ── Filesystem (no-op stubs) ──
		filesystem: new Proxy({} as never, {
			get: () => () => undefined,
		}),

		// ── System (no-op stubs) ──
		system: new Proxy({} as never, {
			get: () => () => Promise.resolve({ stdout: "", stderr: "", exitCode: 0 }),
		}),

		// ── HTTP (no-op stub) ──
		http: new Proxy({} as never, {
			get: () => () => Promise.resolve({}),
		}),

		// ── Template (no-op stubs) ──
		template: new Proxy({} as never, {
			get: () => () => Promise.resolve(""),
		}),

		// ── Strings (pass-through identity) ──
		strings: new Proxy({} as never, {
			get: () => (str: string) => str,
		}),

		// ── Semver (no-op stubs) ──
		semver: new Proxy({} as never, {
			get: () => () => false,
		}),

		// ── Package Manager (no-op stubs) ──
		packageManager: new Proxy({} as never, {
			get: () => () => Promise.resolve(undefined),
		}),

		// ── Config (no-op stubs) ──
		config: new Proxy({} as never, {
			get: () => () => Promise.resolve({}),
		}),

		// ── Patching (no-op stubs) ──
		patching: new Proxy({} as never, {
			get: () => () => Promise.resolve(false),
		}),
	} as unknown as Seed<Record<string, unknown>, Record<string, unknown>>;
}
