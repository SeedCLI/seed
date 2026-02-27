export interface StringsModule {
	// Case conversion
	camelCase(str: string): string;
	pascalCase(str: string): string;
	snakeCase(str: string): string;
	kebabCase(str: string): string;
	constantCase(str: string): string;
	titleCase(str: string): string;
	sentenceCase(str: string): string;
	upperFirst(str: string): string;
	lowerFirst(str: string): string;

	// Pluralization
	plural(str: string): string;
	singular(str: string): string;
	isPlural(str: string): boolean;
	isSingular(str: string): boolean;

	// Manipulation
	truncate(str: string, length: number, suffix?: string): string;
	pad(str: string, length: number, char?: string): string;
	padStart(str: string, length: number, char?: string): string;
	padEnd(str: string, length: number, char?: string): string;
	repeat(str: string, count: number): string;
	reverse(str: string): string;

	// Checks
	isBlank(str: string | null | undefined): boolean;
	isNotBlank(str: string | null | undefined): boolean;
	isEmpty(str: string | null | undefined): boolean;
	isNotEmpty(str: string | null | undefined): boolean;

	// Template
	template(str: string, data: Record<string, string>): string;
}
