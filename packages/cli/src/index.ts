#!/usr/bin/env bun

import { build } from "@seedcli/core";
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";
import { generateCommand } from "./commands/generate.js";
import { newCommand } from "./commands/new.js";

const cli = build("seed")
	.command(newCommand)
	.command(generateCommand)
	.command(devCommand)
	.command(buildCommand)
	.help()
	.version("0.1.0")
	.create();

await cli.run();
