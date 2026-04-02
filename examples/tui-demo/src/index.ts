import { build } from "@seedcli/core";

import { primitivesCommand } from "./commands/primitives.js";
import { componentsCommand } from "./commands/components.js";
import { stateCommand } from "./commands/state.js";
import { themeCommand } from "./commands/theme.js";
import { pluginsCommand } from "./commands/plugins.js";
import { debugCommand } from "./commands/debug.js";
import { vueDemoCommand } from "./commands/vue-demo.js";
import { fullAppCommand } from "./commands/full-app.js";

const cli = build("tui-demo")
	.version("0.1.0")
	.command(primitivesCommand)
	.command(componentsCommand)
	.command(stateCommand)
	.command(themeCommand)
	.command(pluginsCommand)
	.command(debugCommand)
	.command(vueDemoCommand)
	.command(fullAppCommand)
	.help()
	.onError(async (error, seed) => {
		seed.print.error(error.message);
		process.exitCode = 1;
	})
	.create();

await cli.run();
