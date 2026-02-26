import type { ToolboxExtensions } from "@seedcli/core";
import { arg, command, flag } from "@seedcli/core";

export const searchCommand = command({
	name: "search",
	description: "Search across workspace projects",

	args: {
		query: arg({ type: "string", required: true, description: "Search query" }),
	},

	flags: {
		ext: flag({
			type: "string",
			description: "File extension filter (e.g. ts, js)",
		}),
		max: flag({
			type: "number",
			alias: "m",
			default: 20,
			description: "Maximum results to show",
		}),
	},

	run: async ({ args, flags, print, system, strings, ...toolbox }) => {
		const { workspace } = toolbox as unknown as ToolboxExtensions;

		if (!workspace?.config) {
			print.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		if (!workspace.projectsDir) {
			print.error("No workspace directory configured.");
			process.exitCode = 1;
			return;
		}

		const maxResults = flags.max ?? 20;

		// Check if grep/rg is available
		const rg = await system.which("rg");
		const grepTool = rg ? "rg" : "grep";

		let cmd: string;
		if (rg) {
			cmd = `rg --no-heading --line-number --max-count ${maxResults}`;
			if (flags.ext) cmd += ` --glob "*.${flags.ext}"`;
			cmd += ` "${args.query}" "${workspace.projectsDir}"`;
		} else {
			cmd = `grep -rn --max-count=${maxResults}`;
			if (flags.ext) cmd += ` --include="*.${flags.ext}"`;
			cmd += ` "${args.query}" "${workspace.projectsDir}"`;
		}

		print.muted(`Searching with ${grepTool}...`);

		try {
			const result = await system.exec(cmd);
			const lines = result.stdout.trim().split("\n").filter(Boolean);

			if (lines.length === 0) {
				print.muted("No results found.");
				return;
			}

			print.info(`Found ${lines.length} result(s):\n`);

			for (const line of lines.slice(0, maxResults)) {
				// Trim long lines for readability
				print.highlight(strings.truncate(line, 120));
			}

			if (lines.length > maxResults) {
				print.muted(`\n... and ${lines.length - maxResults} more results`);
			}
		} catch (err: unknown) {
			// grep returns exit code 1 when no matches
			const error = err as Record<string, unknown>;
			if (error?.exitCode === 1) {
				print.muted("No results found.");
			} else {
				const message = error?.message ?? String(err);
				print.error(`Search failed: ${message}`);
				process.exitCode = 1;
			}
		}
	},
});
