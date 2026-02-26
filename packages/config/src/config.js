import { loadConfig } from "c12";
export async function load(nameOrOptions, opts) {
    const options = typeof nameOrOptions === "string"
        ? { ...opts, name: nameOrOptions }
        : nameOrOptions;
    const result = await loadConfig({
        name: options.name,
        cwd: options.cwd,
        defaults: options.defaults,
        overrides: options.overrides,
        dotenv: options.dotenv,
        packageJson: options.packageJson,
        rcFile: options.rcFile === true ? `.${options.name}rc` : options.rcFile,
        globalRc: options.globalRc,
    });
    // Find the config file path from layers
    let configFile;
    for (const layer of result.layers ?? []) {
        if (layer.source && typeof layer.source === "string") {
            configFile = layer.source;
            break;
        }
    }
    return {
        config: (result.config ?? {}),
        layers: (result.layers ?? []).map((layer) => ({
            config: (layer.config ?? {}),
            source: layer.source,
            sourceOptions: layer.sourceOptions,
        })),
        cwd: result.cwd ?? options.cwd ?? process.cwd(),
        configFile,
    };
}
export async function loadFile(filePath) {
    const file = Bun.file(filePath);
    const text = await file.text();
    if (filePath.endsWith(".json")) {
        return JSON.parse(text);
    }
    // For JS/TS config files, use dynamic import
    const mod = await import(filePath);
    const config = mod.default ?? mod;
    return config;
}
export function get(obj, path, defaultValue) {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        if (typeof current !== "object") {
            return defaultValue;
        }
        current = current[key];
    }
    return (current !== undefined ? current : defaultValue);
}
//# sourceMappingURL=config.js.map