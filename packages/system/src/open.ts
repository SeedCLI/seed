import { os } from "./info.js";

export async function open(target: string): Promise<void> {
	const platform = os();

	let cmd: string[];
	switch (platform) {
		case "macos":
			cmd = ["open", target];
			break;
		case "linux":
			cmd = ["xdg-open", target];
			break;
		case "windows":
			// Escape shell metacharacters to prevent command injection via cmd /c
			cmd = ["cmd", "/c", "start", "", target.replace(/[&|<>^"]/g, "^$&")];
			break;
		default:
			throw new Error(`Cannot open "${target}": unsupported platform "${platform}"`);
	}

	const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		throw new Error(
			`Failed to open "${target}": ${cmd[0]} exited with code ${exitCode}${stderr ? `\n${stderr.trim()}` : ""}`,
		);
	}
}
