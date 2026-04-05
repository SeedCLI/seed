import type { PackageManagerName } from "./types.js";

interface CommandMap {
	install: string;
	add: string;
	addDev: string[];
	remove: string;
	run: string;
}

const COMMANDS: Record<PackageManagerName, CommandMap> = {
	bun: {
		install: "bun install",
		add: "bun add",
		addDev: ["bun", "add", "-d"],
		remove: "bun remove",
		run: "bun run",
	},
	npm: {
		install: "npm install",
		add: "npm install",
		addDev: ["npm", "install", "--save-dev"],
		remove: "npm uninstall",
		run: "npm run",
	},
	yarn: {
		install: "yarn install",
		add: "yarn add",
		addDev: ["yarn", "add", "--dev"],
		remove: "yarn remove",
		run: "yarn run",
	},
	pnpm: {
		install: "pnpm install",
		add: "pnpm add",
		addDev: ["pnpm", "add", "-D"],
		remove: "pnpm remove",
		run: "pnpm run",
	},
};

export function getCommands(name: PackageManagerName): CommandMap {
	return COMMANDS[name];
}

/**
 * Returns the script-run prefix for a package manager.
 * e.g. "npm run", "pnpm run", "bun run", "yarn"
 */
export function pmRunPrefix(name: PackageManagerName): string {
	return name === "yarn" ? "yarn" : `${name} run`;
}

/**
 * Infer the invoking package manager from `npm_config_user_agent`.
 * Returns undefined if the environment variable is absent or unrecognized.
 *
 * Example values:
 *   "npm/10.5.0 node/v22.0.0 darwin arm64"
 *   "pnpm/9.15.0 node/v22.0.0"
 *   "yarn/4.1.0 node/v22.0.0"
 *   "bun/1.2.0"
 */
export function detectFromUserAgent(): PackageManagerName | undefined {
	const ua = process.env.npm_config_user_agent;
	if (!ua) return undefined;
	const name = ua.split("/")[0];
	if (name === "npm" || name === "pnpm" || name === "yarn" || name === "bun") {
		return name;
	}
	return undefined;
}
