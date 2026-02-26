import type { Runtime } from "@seedcli/core";
import { createInterceptor } from "./interceptor.js";
import { applyEnvMocks, createMockState } from "./mocks.js";
import type { TestCliBuilder, TestResult } from "./types.js";

/**
 * Parse a command string into an argv array, respecting quotes.
 */
function parseArgv(input: string): string[] {
	const args: string[] = [];
	let current = "";
	let inQuote: "'" | '"' | null = null;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		if (inQuote) {
			if (char === inQuote) {
				inQuote = null;
			} else {
				current += char;
			}
		} else if (char === '"' || char === "'") {
			inQuote = char;
		} else if (char === " ") {
			if (current.length > 0) {
				args.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}

	if (current.length > 0) {
		args.push(current);
	}

	return args;
}

/**
 * Create a test CLI builder for testing commands against a runtime.
 *
 * ```ts
 * const cli = createTestCli(runtime);
 * const result = await cli.run("greet World");
 * expect(result.stdout).toContain("Hello, World!");
 * ```
 */
export function createTestCli(runtime: Runtime): TestCliBuilder {
	const state = createMockState();

	const builder: TestCliBuilder = {
		mockPrompt(responses) {
			Object.assign(state.promptResponses, responses);
			return builder;
		},

		mockConfig(config) {
			Object.assign(state.configData, config);
			return builder;
		},

		mockSystem(command, result) {
			state.systemMocks.set(command, result);
			return builder;
		},

		env(vars) {
			Object.assign(state.envVars, vars);
			return builder;
		},

		async run(argv: string): Promise<TestResult> {
			const interceptor = createInterceptor();
			let restoreEnv: (() => void) | undefined;
			let exitCode = 0;

			try {
				interceptor.start();

				// Apply env mocks
				if (Object.keys(state.envVars).length > 0) {
					restoreEnv = applyEnvMocks(state.envVars);
				}

				const args = parseArgv(argv);
				await runtime.run(args);

				// Read exitCode before stop() to avoid race conditions
				exitCode = Number(process.exitCode ?? 0);
			} catch (err) {
				interceptor.stderr += err instanceof Error ? err.message : String(err);
				exitCode = 1;
			} finally {
				interceptor.stop();
				restoreEnv?.();
			}

			return {
				stdout: interceptor.stdout,
				stderr: interceptor.stderr,
				exitCode,
			};
		},
	};

	return builder;
}
