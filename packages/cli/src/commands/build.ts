import { join } from "node:path";
import { command, flag } from "@seedcli/core";
import { exists } from "@seedcli/filesystem";
import { colors, error, info, success } from "@seedcli/print";
import { resolveEntry } from "../utils/resolve-entry.js";

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const buildCommand = command({
	name: "build",
	description: "Bundle or compile your CLI",
	flags: {
		compile: flag({ type: "boolean", description: "Compile to standalone binary" }),
		outfile: flag({ type: "string", alias: "o", description: "Output file path" }),
		outdir: flag({ type: "string", description: "Output directory" }),
		target: flag({ type: "string", description: "Compile targets (comma-separated)" }),
		minify: flag({ type: "boolean", description: "Minify output" }),
		sourcemap: flag({ type: "boolean", description: "Generate sourcemaps" }),
		analyze: flag({ type: "boolean", description: "Show bundle size analysis" }),
	},
	run: async ({ flags }) => {
		const cwd = process.cwd();
		const entry = await resolveEntry(cwd);

		if (!entry) {
			error("Could not detect entry point. Specify in seed.config.ts or package.json bin field.");
			process.exitCode = 1;
			return;
		}

		const entryPath = join(cwd, entry);
		if (!(await exists(entryPath))) {
			error(`Entry point not found: ${entry}`);
			process.exitCode = 1;
			return;
		}

		if (flags.compile) {
			// ─── Compile Mode ───
			await compileMode(entryPath, cwd, flags);
		} else {
			// ─── Bundle Mode ───
			await bundleMode(entryPath, cwd, flags);
		}
	},
});

async function bundleMode(
	entryPath: string,
	cwd: string,
	flags: { outdir?: string; minify?: boolean; sourcemap?: boolean; analyze?: boolean },
): Promise<void> {
	const outdir = flags.outdir ?? join(cwd, "dist");

	info(`${colors.cyan("seed build")} bundling ${colors.dim(entryPath)}`);

	const result = await Bun.build({
		entrypoints: [entryPath],
		outdir,
		target: "bun",
		minify: flags.minify ?? false,
		sourcemap: flags.sourcemap ? "external" : "none",
	});

	if (!result.success) {
		for (const log of result.logs) {
			error(String(log));
		}
		process.exitCode = 1;
		return;
	}

	for (const output of result.outputs) {
		const size = formatSize(output.size);
		info(`  ${colors.green("✔")} ${colors.dim(output.path)} ${colors.cyan(size)}`);
	}

	if (flags.analyze) {
		info("");
		info(colors.bold("Bundle Analysis:"));
		let totalSize = 0;
		for (const output of result.outputs) {
			totalSize += output.size;
			info(`  ${output.path.split("/").pop()} — ${formatSize(output.size)}`);
		}
		info(`  ${colors.bold("Total:")} ${formatSize(totalSize)}`);
	}

	success("Build complete");
}

async function compileMode(
	entryPath: string,
	cwd: string,
	flags: { outfile?: string; target?: string; minify?: boolean },
): Promise<void> {
	const targets = flags.target ? flags.target.split(",").map((t) => t.trim()) : [undefined];

	for (const target of targets) {
		const args = ["bun", "build", entryPath, "--compile"];

		if (flags.outfile) {
			args.push("--outfile", flags.outfile);
		}

		if (flags.minify) {
			args.push("--minify");
		}

		if (target) {
			args.push("--target", target);
			info(`${colors.cyan("seed build")} compiling for ${colors.bold(target)}...`);
		} else {
			info(`${colors.cyan("seed build")} compiling...`);
		}

		const proc = Bun.spawn(args, {
			cwd,
			stdout: "inherit",
			stderr: "inherit",
		});

		const exitCode = await proc.exited;
		if (exitCode !== 0) {
			error(`Compilation failed${target ? ` for target ${target}` : ""}`);
			process.exitCode = 1;
			return;
		}

		success(`Compiled${target ? ` for ${target}` : ""}`);
	}
}
