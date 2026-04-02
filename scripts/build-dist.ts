/**
 * Build standalone executables via esbuild + Hakobu
 *
 * Two-step process (same pattern as camoufox-ts):
 *   1. esbuild bundles all workspace packages into a single CJS file
 *   2. Hakobu packages that single file into standalone executables
 *      using native mode (no --bundle, no Rolldown)
 *
 * This avoids:
 *   - Rolldown's limitations with native addons and ESM edge cases
 *   - Native mode's inability to resolve workspace: dependencies
 *   - Code signing issues from the exec() API path
 */

import * as esbuild from "esbuild";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
	"node24-linux-x64",
	"node24-linux-arm64",
	"node24-macos-arm64",
	"node24-win-x64",
];

// Resolve the hakobu CLI JS entry from node_modules
function resolveHakobuBin(): string {
	const jsEntry = path.join(
		ROOT,
		"node_modules",
		"@hakobu",
		"hakobu",
		"lib-es5",
		"bin.js",
	);
	if (existsSync(jsEntry)) return jsEntry;
	throw new Error("Cannot find @hakobu/hakobu. Run pnpm install first.");
}

async function main() {
	const hakobuBin = resolveHakobuBin();
	const cliEntry = path.join(ROOT, "packages/cli/dist/index.js");
	const stageDir = path.join(ROOT, "dist/.stage");

	if (!existsSync(cliEntry)) {
		console.error("CLI entry not found. Run `pnpm run build` first.");
		process.exit(1);
	}

	// ── Step 1: esbuild bundles everything into a single CJS file ──
	console.log("Step 1: Bundling with esbuild...\n");

	// Clean staging directory
	if (existsSync(stageDir)) rmSync(stageDir, { recursive: true });
	mkdirSync(stageDir, { recursive: true });

	const bundledEntry = path.join(stageDir, "cli.mjs");

	const result = await esbuild.build({
		entryPoints: [cliEntry],
		bundle: true,
		platform: "node",
		target: "node24",
		format: "esm",
		outfile: bundledEntry,
		// Keep native addons, build-time tools, and optional deps external
		external: [
			"fsevents",
			"@aws-sdk/client-s3",
			"esbuild",
			"@hakobu/hakobu",
			"@hakobu/hakobu-fetch",
		],
		// Inline all workspace packages
		packages: "bundle",
		// Produce a single file — no code splitting
		splitting: false,
		sourcemap: false,
		minify: false,
		logLevel: "warning",
		banner: {
			// Create a CJS-compatible require() for packages that use require('fs') etc.
			// Hakobu's ESM shim already provides __filename/__dirname, so don't redeclare.
			js: `import { createRequire as __esbuild_createRequire } from 'node:module';
const require = __esbuild_createRequire(import.meta.url);`,
		},
	});

	if (result.errors.length > 0) {
		console.error("esbuild failed:", result.errors);
		process.exit(1);
	}

	console.log(`  Bundled → ${path.relative(ROOT, bundledEntry)}`);

	// Read CLI package version
	const { readFile: readFileAsync } = await import("node:fs/promises");
	const cliPkgJson = JSON.parse(
		await readFileAsync(path.join(ROOT, "packages/cli/package.json"), "utf-8"),
	);

	// The CLI entry does: join(import.meta.dirname, "..", "package.json")
	// In the snapshot this resolves to <stageDir>/../package.json
	// So we need package.json BOTH at stageDir level (for Hakobu) and
	// one level up (for the CLI's relative path resolution).
	// Simplest approach: nest the entry inside a subdirectory.
	const entryDir = path.join(stageDir, "dist");
	mkdirSync(entryDir, { recursive: true });

	// Move the bundled entry into the subdirectory
	const { renameSync } = await import("node:fs");
	renameSync(bundledEntry, path.join(entryDir, "cli.mjs"));

	// Root package.json (what Hakobu reads + what the CLI finds via "../package.json")
	const stagePkg = {
		name: "seed",
		version: cliPkgJson.version || "1.0.0",
		type: "module",
		main: "dist/cli.mjs",
		bin: { seed: "dist/cli.mjs" },
	};
	writeFileSync(
		path.join(stageDir, "package.json"),
		JSON.stringify(stagePkg, null, 2),
	);

	// ── Step 2: Hakobu packages the bundled output ──
	console.log("\nStep 2: Packaging with Hakobu...\n");

	for (const target of TARGETS) {
		const suffix = target.replace("node24-", "");
		const ext = target.includes("win") ? ".exe" : "";
		const outputPath = path.join(ROOT, "dist", `seed-${suffix}${ext}`);

		process.stdout.write(`  ${suffix}...`);

		try {
			const { stderr } = await execFileAsync(
				process.execPath,
				[
					hakobuBin,
					stageDir,
					"--target",
					target,
					"--output",
					outputPath,
				],
				{
					cwd: ROOT,
					timeout: 300000,
					env: { ...process.env, NODE_NO_WARNINGS: "1" },
				},
			);

			// Filter expected warnings
			if (stderr) {
				const important = stderr
					.split("\n")
					.filter(
						(l) =>
							l.includes("Error") &&
							!l.includes("@sec-ant/readable-stream"),
					);
				if (important.length > 0) console.error("\n" + important.join("\n"));
			}

			console.log(" OK");
		} catch (err: unknown) {
			console.log(" FAIL");
			const error = err as { stderr?: string };
			if (error.stderr?.trim()) {
				console.error(
					error.stderr
						.split("\n")
						.slice(-5)
						.join("\n"),
				);
			}
		}
	}

	// ── Post-build: verify macOS signature ──
	if (process.platform === "darwin") {
		for (const target of TARGETS) {
			if (!target.includes("macos")) continue;
			const suffix = target.replace("node24-", "");
			const binaryPath = path.join(ROOT, "dist", `seed-${suffix}`);
			if (!existsSync(binaryPath)) continue;

			try {
				await execFileAsync("codesign", ["--verify", binaryPath]);
				console.log(`\n  ${path.basename(binaryPath)}: signature valid`);
			} catch {
				console.log(`\n  ${path.basename(binaryPath)}: re-signing...`);
				try {
					await execFileAsync("codesign", [
						"--force",
						"--sign",
						"-",
						binaryPath,
					]);
					console.log("  Re-signed OK");
				} catch (signErr: unknown) {
					const se = signErr as { stderr?: string };
					console.error(`  Warning: ${se.stderr?.trim() || signErr}`);
				}
			}
		}
	}

	// ── Cleanup staging ──
	rmSync(stageDir, { recursive: true, force: true });

	// ── Summary ──
	console.log("\nDone! Executables:");
	for (const target of TARGETS) {
		const suffix = target.replace("node24-", "");
		const ext = target.includes("win") ? ".exe" : "";
		const file = path.join(ROOT, "dist", `seed-${suffix}${ext}`);
		if (existsSync(file)) {
			const size = (
				(await import("node:fs/promises")).stat(file)
			).then((s) => `${(s.size / 1024 / 1024).toFixed(1)}MB`);
			console.log(`  dist/seed-${suffix}${ext}`);
		}
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
