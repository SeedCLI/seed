export interface PathHelpers {
	resolve(...segments: string[]): string;
	join(...segments: string[]): string;
	dirname(path: string): string;
	basename(path: string, ext?: string): string;
	ext(path: string): string;
	isAbsolute(path: string): boolean;
	relative(from: string, to: string): string;
	normalize(path: string): string;
	separator: string;
	home(): string;
	cwd(): string;
}

export interface CopyOptions {
	overwrite?: boolean;
	filter?: (path: string) => boolean;
}

export interface MoveOptions {
	overwrite?: boolean;
}

export interface FindOptions {
	matching?: string | string[];
	ignore?: string | string[];
	files?: boolean;
	directories?: boolean;
	recursive?: boolean;
	dot?: boolean;
}

export interface JsonWriteOptions {
	indent?: number;
	sortKeys?: boolean;
}

export interface TmpOptions {
	prefix?: string;
}

export interface TmpFileOptions {
	ext?: string;
	prefix?: string;
	dir?: string;
}
