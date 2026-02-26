export interface InputOptions {
	message: string;
	default?: string;
	required?: boolean;
	validate?: (value: string) => boolean | string;
	transformer?: (value: string) => string;
}

export interface NumberOptions {
	message: string;
	default?: number;
	min?: number;
	max?: number;
	step?: number;
	required?: boolean;
	validate?: (value: number | undefined) => boolean | string;
}

export interface ConfirmOptions {
	message: string;
	default?: boolean;
}

export interface PasswordOptions {
	message: string;
	mask?: string | boolean;
	validate?: (value: string) => boolean | string;
}

export interface EditorOptions {
	message: string;
	default?: string;
	postfix?: string;
	validate?: (value: string) => boolean | string;
	waitForUserInput?: boolean;
}

export interface Choice<T = string> {
	name?: string;
	value: T;
	description?: string;
	disabled?: boolean | string;
}

export interface SelectOptions<T = string> {
	message: string;
	choices: ReadonlyArray<Choice<T> | T>;
	default?: T;
	loop?: boolean;
}

export interface MultiselectOptions<T = string> {
	message: string;
	choices: ReadonlyArray<Choice<T> | T>;
	default?: ReadonlyArray<T>;
	required?: boolean;
	loop?: boolean;
	validate?: (value: ReadonlyArray<T>) => boolean | string;
}

export interface AutocompleteOptions<T = string> {
	message: string;
	source: (input: string | undefined) => Promise<ReadonlyArray<Choice<T> | T>>;
	default?: T;
}

export interface FormField<K extends string = string> {
	name: K;
	type: "input" | "number" | "confirm" | "password" | "select";
	message: string;
	default?: unknown;
	choices?: ReadonlyArray<Choice | string>;
	validate?: (value: unknown) => boolean | string;
}

export interface PromptModule {
	input(options: InputOptions): Promise<string>;
	number(options: NumberOptions): Promise<number | undefined>;
	confirm(options: ConfirmOptions): Promise<boolean>;
	password(options: PasswordOptions): Promise<string>;
	editor(options: EditorOptions): Promise<string>;
	select<T>(options: SelectOptions<T>): Promise<T>;
	multiselect<T>(options: MultiselectOptions<T>): Promise<ReadonlyArray<T>>;
	autocomplete<T>(options: AutocompleteOptions<T>): Promise<T>;
	form<T extends Record<string, unknown>>(fields: ReadonlyArray<FormField>): Promise<T>;
}
