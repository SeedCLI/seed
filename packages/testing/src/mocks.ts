export interface MockState {
	promptResponses: Record<string, unknown>;
	configData: Record<string, unknown>;
	systemMocks: Map<string, { stdout?: string; stderr?: string; exitCode?: number }>;
	envVars: Record<string, string>;
}

export function createMockState(): MockState {
	return {
		promptResponses: {},
		configData: {},
		systemMocks: new Map(),
		envVars: {},
	};
}

/**
 * Apply environment variable overrides. Returns a restore function.
 */
export function applyEnvMocks(vars: Record<string, string>): () => void {
	const originals: Record<string, string | undefined> = {};

	for (const [key, value] of Object.entries(vars)) {
		originals[key] = process.env[key];
		process.env[key] = value;
	}

	return () => {
		for (const [key, original] of Object.entries(originals)) {
			if (original === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = original;
			}
		}
	};
}
