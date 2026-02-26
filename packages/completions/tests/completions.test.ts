import { describe, expect, test } from "bun:test";
import { bash } from "../src/bash.js";
import { detect } from "../src/detect.js";
import { fish } from "../src/fish.js";
import { powershell } from "../src/powershell.js";
import type { CompletionInfo } from "../src/types.js";
import { zsh } from "../src/zsh.js";

const sampleInfo: CompletionInfo = {
	brand: "mycli",
	commands: [
		{
			name: "deploy",
			description: "Deploy the application",
			aliases: ["d"],
			flags: [
				{
					name: "env",
					alias: "e",
					description: "Target environment",
					type: "string",
					choices: ["staging", "prod"],
				},
				{ name: "force", alias: "f", description: "Force deploy", type: "boolean" },
			],
			args: [{ name: "target", description: "Deploy target" }],
		},
		{
			name: "init",
			description: "Initialize project",
			subcommands: [
				{
					name: "config",
					description: "Initialize config file",
					flags: [{ name: "template", description: "Config template", type: "string" }],
				},
			],
		},
	],
};

describe("completions", () => {
	describe("bash()", () => {
		test("generates valid bash completion script", () => {
			const result = bash(sampleInfo);
			expect(result).toContain("_mycli_completions");
			expect(result).toContain("complete -F _mycli_completions mycli");
			expect(result).toContain("deploy");
			expect(result).toContain("init");
		});

		test("includes flags in command completions", () => {
			const result = bash(sampleInfo);
			expect(result).toContain("--env");
			expect(result).toContain("-e");
			expect(result).toContain("--force");
		});

		test("includes subcommands", () => {
			const result = bash(sampleInfo);
			expect(result).toContain("config");
		});
	});

	describe("zsh()", () => {
		test("generates valid zsh completion script", () => {
			const result = zsh(sampleInfo);
			expect(result).toContain("#compdef mycli");
			expect(result).toContain("_mycli()");
			expect(result).toContain("deploy");
			expect(result).toContain("Deploy the application");
		});

		test("generates command functions", () => {
			const result = zsh(sampleInfo);
			expect(result).toContain("_mycli_deploy()");
			expect(result).toContain("_mycli_init()");
		});

		test("includes flag descriptions", () => {
			const result = zsh(sampleInfo);
			expect(result).toContain("--env");
			expect(result).toContain("Target environment");
		});
	});

	describe("fish()", () => {
		test("generates valid fish completion script", () => {
			const result = fish(sampleInfo);
			expect(result).toContain("complete -c mycli");
			expect(result).toContain("deploy");
			expect(result).toContain("init");
		});

		test("includes flags with descriptions", () => {
			const result = fish(sampleInfo);
			expect(result).toContain("-l 'env'");
			expect(result).toContain("-s 'e'");
			expect(result).toContain("Force deploy");
		});

		test("includes command aliases", () => {
			const result = fish(sampleInfo);
			expect(result).toContain("'d'");
		});

		test("includes flag choices", () => {
			const result = fish(sampleInfo);
			expect(result).toContain("staging prod");
		});
	});

	describe("powershell()", () => {
		test("generates valid PowerShell completion script", () => {
			const result = powershell(sampleInfo);
			expect(result).toContain("Register-ArgumentCompleter");
			expect(result).toContain("-CommandName 'mycli'");
			expect(result).toContain("deploy");
			expect(result).toContain("init");
		});

		test("includes flags as ParameterName completions", () => {
			const result = powershell(sampleInfo);
			expect(result).toContain("--env");
			expect(result).toContain("--force");
		});

		test("includes subcommands", () => {
			const result = powershell(sampleInfo);
			expect(result).toContain("config");
		});
	});

	describe("detect()", () => {
		test("detects shell from SHELL env var", () => {
			const original = process.env.SHELL;
			try {
				process.env.SHELL = "/bin/zsh";
				expect(detect()).toBe("zsh");

				process.env.SHELL = "/usr/bin/fish";
				expect(detect()).toBe("fish");

				process.env.SHELL = "/bin/bash";
				expect(detect()).toBe("bash");
			} finally {
				process.env.SHELL = original;
			}
		});

		test("detects powershell from PSModulePath", () => {
			const originalShell = process.env.SHELL;
			const originalPs = process.env.PSModulePath;
			try {
				process.env.SHELL = "";
				process.env.PSModulePath = "/some/path";
				expect(detect()).toBe("powershell");
			} finally {
				process.env.SHELL = originalShell;
				process.env.PSModulePath = originalPs;
			}
		});

		test("defaults to bash", () => {
			const originalShell = process.env.SHELL;
			const originalPs = process.env.PSModulePath;
			try {
				process.env.SHELL = "";
				delete process.env.PSModulePath;
				expect(detect()).toBe("bash");
			} finally {
				process.env.SHELL = originalShell;
				process.env.PSModulePath = originalPs;
			}
		});
	});
});
