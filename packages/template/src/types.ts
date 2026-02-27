export interface RenderOptions {
	source: string;
	target: string;
	props?: Record<string, unknown>;
}

export interface GenerateOptions {
	template: string;
	target: string;
	props?: Record<string, unknown>;
	directory?: string;
	overwrite?: boolean;
}

export interface DirectoryOptions {
	source: string;
	target: string;
	props?: Record<string, unknown>;
	overwrite?: boolean;
	ignore?: string[];
	rename?: Record<string, string>;
}

export interface TemplateModule {
	render(options: RenderOptions): Promise<string>;
	renderFile(filePath: string, props?: Record<string, unknown>): Promise<string>;
	renderString(source: string, props?: Record<string, unknown>): Promise<string>;
	generate(options: GenerateOptions): Promise<string>;
	directory(options: DirectoryOptions): Promise<string[]>;
}
