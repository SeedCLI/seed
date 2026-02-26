import { describe, expect, test } from "bun:test";
import { renderCommandHelp, renderGlobalHelp } from "../src/command/help.js";
import { arg, command, flag } from "../src/index.js";

// ─── Test Commands ───

const deployCmd = command({
	name: "deploy",
	description: "Deploy the application",
	args: {
		env: arg({ type: "string", required: true, choices: ["staging", "prod"] as const }),
	},
	flags: {
		force: flag({ type: "boolean", default: false, alias: "f", description: "Force deployment" }),
		replicas: flag({ type: "number", alias: "r", description: "Number of replicas" }),
	},
});

const devCmd = command({ name: "dev", description: "Start development mode" });
const helpCmdDef = command({ name: "help", description: "Show help" });
const hiddenCmd = command({ name: "secret", description: "Secret command", hidden: true });
const aliasCmd = command({ name: "generate", description: "Generate files", alias: ["g", "gen"] });

const migrateCmd = command({ name: "migrate", description: "Run migrations" });
const seedDbCmd = command({ name: "seed", description: "Seed database" });
const dbCmd = command({
	name: "db",
	description: "Database commands",
	subcommands: [migrateCmd, seedDbCmd],
});

const commands = [deployCmd, devCmd, helpCmdDef, hiddenCmd, aliasCmd, dbCmd];

// ─── Global Help ───

describe("renderGlobalHelp()", () => {
	test("includes brand and version", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli", version: "1.0.0" });
		expect(output).toContain("mycli v1.0.0");
	});

	test("shows usage line", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli" });
		expect(output).toContain("mycli <command> [options]");
	});

	test("lists visible commands", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli" });
		expect(output).toContain("deploy");
		expect(output).toContain("Deploy the application");
		expect(output).toContain("dev");
	});

	test("hides hidden commands by default", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli" });
		expect(output).not.toContain("secret");
	});

	test("shows hidden commands when option set", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli", showHidden: true });
		expect(output).toContain("secret");
	});

	test("shows aliases", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli" });
		expect(output).toContain("g, gen");
	});

	test("hides aliases when disabled", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli", showAliases: false });
		expect(output).not.toContain("(g, gen)");
	});

	test("sorts commands alphabetically", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli" });
		const lines = output.split("\n");
		const cmdLines = lines.filter((l) => l.startsWith("  ") && l.trim().length > 0);
		// Check "db" comes before "deploy" (alphabetical)
		const dbIndex = cmdLines.findIndex((l) => l.includes("db"));
		const deployIndex = cmdLines.findIndex((l) => l.includes("deploy"));
		if (dbIndex !== -1 && deployIndex !== -1) {
			expect(dbIndex).toBeLessThan(deployIndex);
		}
	});

	test("includes global flags", () => {
		const output = renderGlobalHelp(commands, { brand: "mycli" });
		expect(output).toContain("--help");
		expect(output).toContain("--version");
	});

	test("supports custom header", () => {
		const output = renderGlobalHelp(commands, { header: "My Custom CLI Tool" });
		expect(output).toContain("My Custom CLI Tool");
	});
});

// ─── Command Help ───

describe("renderCommandHelp()", () => {
	test("shows command description", () => {
		const output = renderCommandHelp(deployCmd, { brand: "mycli" });
		expect(output).toContain("Deploy the application");
	});

	test("shows usage line with args", () => {
		const output = renderCommandHelp(deployCmd, { brand: "mycli" });
		expect(output).toContain("mycli deploy <env> [options]");
	});

	test("shows arguments section", () => {
		const output = renderCommandHelp(deployCmd, { brand: "mycli" });
		expect(output).toContain("ARGUMENTS");
		expect(output).toContain("env");
		expect(output).toContain("(required)");
		expect(output).toContain("staging | prod");
	});

	test("shows flags section", () => {
		const output = renderCommandHelp(deployCmd, { brand: "mycli" });
		expect(output).toContain("FLAGS");
		expect(output).toContain("--force");
		expect(output).toContain("-f");
		expect(output).toContain("Force deployment");
		expect(output).toContain("--replicas");
		expect(output).toContain("-r");
	});

	test("shows default values", () => {
		const output = renderCommandHelp(deployCmd, { brand: "mycli" });
		expect(output).toContain("(default: false)");
	});

	test("shows aliases", () => {
		const output = renderCommandHelp(aliasCmd, { brand: "mycli" });
		expect(output).toContain("ALIASES");
		expect(output).toContain("g, gen");
	});

	test("shows subcommands", () => {
		const output = renderCommandHelp(dbCmd, { brand: "mycli" });
		expect(output).toContain("SUBCOMMANDS");
		expect(output).toContain("migrate");
		expect(output).toContain("seed");
	});

	test("handles command with no args or flags", () => {
		const output = renderCommandHelp(devCmd, { brand: "mycli" });
		expect(output).toContain("USAGE");
		expect(output).not.toContain("ARGUMENTS");
		expect(output).not.toContain("FLAGS");
	});

	test("optional args shown with brackets", () => {
		const optCmd = command({
			name: "greet",
			args: { name: arg({ type: "string" }) },
		});
		const output = renderCommandHelp(optCmd, { brand: "mycli" });
		expect(output).toContain("[name]");
	});

	test("flag type placeholder for number", () => {
		const output = renderCommandHelp(deployCmd, { brand: "mycli" });
		expect(output).toContain("-r, --replicas <n>");
	});
});
