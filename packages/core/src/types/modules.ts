// ─── Module Interfaces ───
// Placeholder interfaces for toolbox modules.
// Each will be implemented in its own package and fleshed out in later weeks.

/**
 * Print module — structured logging, colors, spinner, table, etc.
 * Full implementation in @seedcli/print.
 */
export interface PrintModule {
	info(msg: string): void;
	success(msg: string): void;
	warning(msg: string): void;
	error(msg: string): void;
	debug(msg: string): void;
	highlight(msg: string): void;
	muted(msg: string): void;
	newline(): void;
}

/**
 * Filesystem module placeholder.
 * Full implementation in @seedcli/filesystem.
 */
export interface FilesystemModule {
	read(path: string, encoding?: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	exists(path: string): Promise<boolean>;
	remove(path: string): Promise<void>;
}

/**
 * System module placeholder.
 * Full implementation in @seedcli/system.
 */
export interface SystemModule {
	exec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
	which(executable: string): Promise<string | null>;
}

/**
 * Strings module placeholder.
 * Full implementation in @seedcli/strings.
 */
export interface StringsModule {
	camelCase(str: string): string;
	pascalCase(str: string): string;
	snakeCase(str: string): string;
	kebabCase(str: string): string;
}
