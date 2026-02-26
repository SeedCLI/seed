export function createMockState() {
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
export function applyEnvMocks(vars) {
    const originals = {};
    for (const [key, value] of Object.entries(vars)) {
        originals[key] = process.env[key];
        process.env[key] = value;
    }
    return () => {
        for (const [key, original] of Object.entries(originals)) {
            if (original === undefined) {
                delete process.env[key];
            }
            else {
                process.env[key] = original;
            }
        }
    };
}
//# sourceMappingURL=mocks.js.map