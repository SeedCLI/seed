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
			cmd = ["cmd", "/c", "start", "", target];
			break;
	}

	const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
	await proc.exited;
}
