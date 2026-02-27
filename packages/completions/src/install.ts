import { homedir } from "node:os";
import { join } from "node:path";
import { bash } from "./bash.js";
import { detect } from "./detect.js";
import { fish } from "./fish.js";
import { powershell } from "./powershell.js";
import type { CompletionInfo, ShellType } from "./types.js";
import { zsh } from "./zsh.js";

const { appendFile, mkdir } = await import("node:fs/promises");

const GENERATORS: Record<ShellType, (info: CompletionInfo) => string> = {
	bash,
	zsh,
	fish,
	powershell,
};

function getRcPath(shell: ShellType, brand: string): string {
	const home = homedir();

	switch (shell) {
		case "bash":
			return join(home, ".bashrc");
		case "zsh":
			return join(home, ".zshrc");
		case "fish":
			return join(home, ".config", "fish", "completions", `${brand}.fish`);
		case "powershell":
			return (
				process.env.PROFILE ??
				join(home, ".config", "powershell", "Microsoft.PowerShell_profile.ps1")
			);
	}
}

/**
 * Auto-detect shell, generate completion script, and install to the appropriate rc file.
 */
export async function install(
	info: CompletionInfo,
	shell?: ShellType,
): Promise<{ shell: ShellType; path: string }> {
	const detectedShell = shell ?? detect();
	const script = GENERATORS[detectedShell](info);
	const rcPath = getRcPath(detectedShell, info.brand);

	// Ensure parent directory exists for fish
	if (detectedShell === "fish") {
		const dir = join(homedir(), ".config", "fish", "completions");
		await mkdir(dir, { recursive: true });
	}

	const markerStart = `# ${info.brand} completions`;
	const markerEnd = `# end ${info.brand} completions`;
	const block = `\n${markerStart}\n${script}\n${markerEnd}\n`;

	// Check if completions are already installed — update if so
	try {
		const { readFile, writeFile } = await import("node:fs/promises");
		const content = await readFile(rcPath, "utf-8");
		const startIdx = content.indexOf(markerStart);
		if (startIdx !== -1) {
			const endIdx = content.indexOf(markerEnd, startIdx);
			if (endIdx !== -1) {
				// Replace existing block
				const updated =
					content.slice(0, startIdx) +
					`${markerStart}\n${script}\n${markerEnd}` +
					content.slice(endIdx + markerEnd.length);
				await writeFile(rcPath, updated);
			}
			// If no end marker found, leave as-is (legacy install)
			return { shell: detectedShell, path: rcPath };
		}
	} catch {
		// File doesn't exist yet — proceed with install
	}

	await appendFile(rcPath, block);

	return { shell: detectedShell, path: rcPath };
}
