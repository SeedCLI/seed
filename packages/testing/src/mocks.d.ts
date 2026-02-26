export interface MockState {
    promptResponses: Record<string, unknown>;
    configData: Record<string, unknown>;
    systemMocks: Map<string, {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
    }>;
    envVars: Record<string, string>;
}
export declare function createMockState(): MockState;
/**
 * Apply environment variable overrides. Returns a restore function.
 */
export declare function applyEnvMocks(vars: Record<string, string>): () => void;
//# sourceMappingURL=mocks.d.ts.map