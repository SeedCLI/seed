import type { Runtime } from "@seedcli/core";
import type { TestCliBuilder } from "./types.js";
/**
 * Create a test CLI builder for testing commands against a runtime.
 *
 * ```ts
 * const cli = createTestCli(runtime);
 * const result = await cli.run("greet World");
 * expect(result.stdout).toContain("Hello, World!");
 * ```
 */
export declare function createTestCli(runtime: Runtime): TestCliBuilder;
//# sourceMappingURL=test-cli.d.ts.map