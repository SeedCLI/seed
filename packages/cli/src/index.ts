#!/usr/bin/env bun

import { join } from "node:path";
import { build } from "@seedcli/core";
import { readJson } from "@seedcli/filesystem";
import { buildCommand } from "./commands/build.js";
import { devCommand } from "./commands/dev.js";
import { generateCommand } from "./commands/generate.js";
import { newCommand } from "./commands/new.js";

const pkg = await readJson<{ version: string }>(join(import.meta.dir, "..", "package.json"));

const cli = build("seed")
	.command(newCommand)
	.command(generateCommand)
	.command(devCommand)
	.command(buildCommand)
	.help()
	.version(pkg.version)
	.create();

await cli.run();
