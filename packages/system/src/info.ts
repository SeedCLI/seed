import nodeOs from "node:os";

export function os(): "macos" | "linux" | "windows" {
	switch (process.platform) {
		case "darwin":
			return "macos";
		case "linux":
			return "linux";
		case "win32":
			return "windows";
		default:
			return "linux";
	}
}

export function arch(): "x64" | "arm64" | "arm" {
	const a = process.arch;
	if (a === "x64") return "x64";
	if (a === "arm64") return "arm64";
	return "arm";
}

export function platform(): NodeJS.Platform {
	return process.platform;
}

export function hostname(): string {
	return nodeOs.hostname();
}

export function cpus(): number {
	return nodeOs.cpus().length;
}

export function memory(): { total: number; free: number } {
	return {
		total: nodeOs.totalmem(),
		free: nodeOs.freemem(),
	};
}

export function uptime(): number {
	return nodeOs.uptime();
}
