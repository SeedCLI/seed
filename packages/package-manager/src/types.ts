export type PackageManagerName = "bun" | "npm" | "yarn" | "pnpm";

export interface InstallOptions {
	cwd?: string;
	silent?: boolean;
	exact?: boolean;
	global?: boolean;
}

export interface RunOptions {
	cwd?: string;
	args?: string[];
	silent?: boolean;
}

export interface PackageManager {
	readonly name: PackageManagerName;
	install(packages?: string[], options?: InstallOptions): Promise<void>;
	installDev(packages: string[], options?: InstallOptions): Promise<void>;
	remove(packages: string[], options?: InstallOptions): Promise<void>;
	run(script: string, options?: RunOptions): Promise<void>;
	version(): Promise<string>;
}

export interface PackageManagerModule {
	detect(cwd?: string): Promise<PackageManagerName>;
	create(name?: PackageManagerName, cwd?: string): Promise<PackageManager>;
	install(packages: string[], options?: InstallOptions): Promise<void>;
	installDev(packages: string[], options?: InstallOptions): Promise<void>;
	remove(packages: string[], options?: InstallOptions): Promise<void>;
	run(script: string, options?: RunOptions): Promise<void>;
	getCommands(name: PackageManagerName): {
		install: string;
		add: string;
		addDev: string[];
		remove: string;
		run: string;
	};
}
