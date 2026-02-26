import { loadConfig } from "c12";
import type { LoadOptions, ResolvedConfig } from "./types.js";

export async function load<T extends Record<string, unknown> = Record<string, unknown>>(
	nameOrOptions: string | LoadOptions<T>,
	opts?: Omit<LoadOptions<T>, "name">,
): Promise<ResolvedConfig<T>> {
	const options: LoadOptions<T> =
		typeof nameOrOptions === "string"
			? ({ ...opts, name: nameOrOptions } as LoadOptions<T>)
			: nameOrOptions;

	const result = await loadConfig({
		name: options.name,
		cwd: options.cwd,
		defaults: options.defaults as Record<string, unknown>,
		overrides: options.overrides as Record<string, unknown>,
		dotenv: options.dotenv,
		packageJson: options.packageJson,
		rcFile: options.rcFile === true ? `.${options.name}rc` : options.rcFile,
		globalRc: options.globalRc,
	});

	// Find the config file path from layers
	let configFile: string | undefined;
	for (const layer of result.layers ?? []) {
		if (layer.source && typeof layer.source === "string") {
			configFile = layer.source;
			break;
		}
	}

	return {
		config: (result.config ?? {}) as T,
		layers: (result.layers ?? []).map((layer) => ({
			config: (layer.config ?? {}) as Record<string, unknown>,
			source: layer.source,
			sourceOptions: layer.sourceOptions as Record<string, unknown> | undefined,
		})),
		cwd: result.cwd ?? options.cwd ?? process.cwd(),
		configFile,
	};
}

export async function loadFile<T extends Record<string, unknown> = Record<string, unknown>>(
	filePath: string,
): Promise<T> {
	const file = Bun.file(filePath);
	const text = await file.text();

	if (filePath.endsWith(".json")) {
		return JSON.parse(text) as T;
	}

	// For JS/TS config files, use dynamic import
	const mod = await import(filePath);
	const config = mod.default ?? mod;
	return config as T;
}

export function get<T = unknown>(obj: Record<string, unknown>, path: string, defaultValue?: T): T {
	const keys = path.split(".");
	let current: unknown = obj;

	for (const key of keys) {
		if (current === null || current === undefined) {
			return defaultValue as T;
		}
		if (typeof current !== "object") {
			return defaultValue as T;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return (current !== undefined ? current : defaultValue) as T;
}
