import { build } from "@seedcli/core";
import { checkCommand } from "./commands/check.js";
import { envCommand } from "./commands/env.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { newCommand } from "./commands/new.js";
import { openCommand } from "./commands/open.js";
import { runCommand } from "./commands/run.js";
import { searchCommand } from "./commands/search.js";
import { statsCommand } from "./commands/stats.js";
import { workspaceExtension } from "./extensions/workspace.js";
import { timingMiddleware } from "./middleware/timing.js";

const cli = build("projx")
	.version("0.1.0")
	.extension(workspaceExtension)
	.middleware(timingMiddleware)
	.command(initCommand)
	.command(newCommand)
	.command(listCommand)
	.command(infoCommand)
	.command(openCommand)
	.command(runCommand)
	.command(checkCommand)
	.command(searchCommand)
	.command(envCommand)
	.command(statsCommand)
	.help()
	.completions()
	.onError(async (error, toolbox) => {
		toolbox.print.error(error.message);
		toolbox.print.muted("Run projx --help for usage information.");
		process.exitCode = 1;
	})
	.create();

await cli.run();
