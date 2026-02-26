export function env(key: string): string | undefined;
export function env(key: string, defaultValue: string): string;
export function env(key: string, defaultValue?: string): string | undefined {
	return process.env[key] ?? defaultValue;
}
