export interface PatchOptions {
	insert?: string;
	before?: string | RegExp;
	after?: string | RegExp;
	replace?: string | RegExp;
	delete?: string | RegExp;
}

export interface PatchResult {
	changed: boolean;
	content: string;
}

export interface PatchingModule {
	patch(filePath: string, options: PatchOptions): Promise<PatchResult>;
	append(filePath: string, content: string): Promise<void>;
	prepend(filePath: string, content: string): Promise<void>;
	exists(filePath: string, pattern: string | RegExp): Promise<boolean>;
	patchJson<T = Record<string, unknown>>(
		filePath: string,
		mutator: (data: T) => T | undefined,
	): Promise<void>;
}
