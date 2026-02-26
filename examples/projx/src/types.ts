export interface ProjxConfig {
	workspace: string;
	defaultEditor?: string;
	defaultTemplate?: string;
}

export interface ProjectInfo {
	name: string;
	path: string;
	version?: string;
	description?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	lastModified: Date;
	hasGit: boolean;
	packageManager?: string;
}
