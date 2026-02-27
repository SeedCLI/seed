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
		envName: options.envName,
	});

	// Find the config file path from layers
	// c12 stores the file path in `configFile`, while `source` is a source identifier
	let configFile: string | undefined;
	for (const layer of result.layers ?? []) {
		if (layer.configFile && typeof layer.configFile === "string") {
			configFile = layer.configFile;
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
		try {
			return JSON.parse(text) as T;
		} catch (err) {
			throw new Error(
				`Failed to parse JSON config "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	// For JS/TS config files, use dynamic import
	try {
		const mod = await import(filePath);
		const config = mod.default ?? mod;
		return config as T;
	} catch (err) {
		throw new Error(
			`Failed to load config file "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}

export function get<T = unknown>(obj: Record<string, unknown>, path: string, defaultValue?: T): T {
	if (path === "") {
		return defaultValue as T;
	}
	// Support bracket notation for keys with dots: "foo[bar.baz].qux"
	// Also support plain dot paths: "foo.bar.qux"
	const keys: string[] = [];
	let i = 0;
	while (i < path.length) {
		if (path[i] === "[") {
			const end = path.indexOf("]", i + 1);
			if (end === -1) {
				keys.push(path.slice(i));
				break;
			}
			keys.push(path.slice(i + 1, end));
			i = end + 1;
			if (path[i] === ".") i++; // skip trailing dot after ]
		} else {
			const dot = path.indexOf(".", i);
			const bracket = path.indexOf("[", i);
			let end: number;
			if (dot === -1 && bracket === -1) end = path.length;
			else if (dot === -1) end = bracket;
			else if (bracket === -1) end = dot;
			else end = Math.min(dot, bracket);
			if (end > i) keys.push(path.slice(i, end));
			i = end;
			if (path[i] === ".") i++;
		}
	}

	let current: unknown = obj;
	for (const key of keys) {
		if (current === null || current === undefined) {
			return defaultValue as T;
		}
		if (typeof current !== "object") {
			return defaultValue as T;
		}
		// Guard against prototype pollution
		if (key === "__proto__" || key === "constructor" || key === "prototype") {
			return defaultValue as T;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return (current !== undefined ? current : defaultValue) as T;
}
