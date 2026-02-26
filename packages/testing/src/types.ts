import type { Runtime } from "@seedcli/core";

export interface TestResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface TestCliBuilder {
	mockPrompt(responses: Record<string, unknown>): TestCliBuilder;
	mockConfig(config: Record<string, unknown>): TestCliBuilder;
	mockSystem(
		command: string,
		result: { stdout?: string; stderr?: string; exitCode?: number },
	): TestCliBuilder;
	env(vars: Record<string, string>): TestCliBuilder;
	run(argv: string): Promise<TestResult>;
}

export interface TestCliOptions {
	runtime: Runtime;
}
