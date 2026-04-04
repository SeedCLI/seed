import { execa } from "execa";
import { os } from "./info.js";

export async function open(target: string): Promise<void> {
	const platform = os();

	let cmd: string;
	let args: string[];
	switch (platform) {
		case "macos":
			cmd = "open";
			args = [target];
			break;
		case "linux":
			cmd = "xdg-open";
			args = [target];
			break;
		case "windows":
			// Escape shell metacharacters to prevent command injection via cmd /c
			cmd = "cmd";
			args = ["/c", "start", "", target.replace(/[&|<>^"]/g, "^$&")];
			break;
		default:
			throw new Error(`Cannot open "${target}": unsupported platform "${platform}"`);
	}

	const result = await execa(cmd, args, {
		stdout: "ignore",
		stderr: "pipe",
		reject: false,
	});

	if (result.exitCode !== 0) {
		const stderr = result.stderr ?? "";
		throw new Error(
			`Failed to open "${target}": ${cmd} exited with code ${result.exitCode}${stderr ? `\n${stderr.trim()}` : ""}`,
		);
	}
}
