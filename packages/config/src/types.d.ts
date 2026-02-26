export interface LoadOptions<T extends Record<string, unknown> = Record<string, unknown>> {
    name: string;
    cwd?: string;
    defaults?: Partial<T>;
    overrides?: Partial<T>;
    dotenv?: boolean;
    packageJson?: boolean | string;
    rcFile?: boolean | string;
    globalRc?: boolean;
    envName?: string;
}
export interface ConfigLayer {
    config: Record<string, unknown>;
    source?: string;
    sourceOptions?: Record<string, unknown>;
}
export interface ResolvedConfig<T extends Record<string, unknown> = Record<string, unknown>> {
    config: T;
    layers: ConfigLayer[];
    cwd: string;
    configFile?: string;
}
export interface ConfigModule {
    load<T extends Record<string, unknown>>(name: string, options?: Omit<LoadOptions<T>, "name">): Promise<ResolvedConfig<T>>;
    load<T extends Record<string, unknown>>(options: LoadOptions<T>): Promise<ResolvedConfig<T>>;
    loadFile<T extends Record<string, unknown>>(filePath: string): Promise<T>;
    get<T = unknown>(obj: Record<string, unknown>, path: string, defaultValue?: T): T;
}
//# sourceMappingURL=types.d.ts.map