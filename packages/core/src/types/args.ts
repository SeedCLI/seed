// ─── Arg Definition Types ───

export type ArgType = "string" | "number";

export interface ArgDef<
	TType extends ArgType = ArgType,
	TRequired extends boolean = boolean,
	TChoices extends readonly string[] | undefined = readonly string[] | undefined,
	TDefault extends string | number | undefined = string | number | undefined,
> {
	type: TType;
	required?: TRequired;
	choices?: TChoices;
	default?: TDefault;
	description?: string;
	validate?: (value: unknown) => boolean | string;
}

// ─── Flag Definition Types ───

export type FlagType = "boolean" | "string" | "number" | "string[]" | "number[]";

export interface FlagDef<
	TType extends FlagType = FlagType,
	TRequired extends boolean = boolean,
	TChoices extends readonly string[] | undefined = readonly string[] | undefined,
	TDefault = unknown,
> {
	type: TType;
	required?: TRequired;
	choices?: TChoices;
	default?: TDefault;
	alias?: string;
	description?: string;
	hidden?: boolean;
	validate?: (value: unknown) => boolean | string;
}

// ─── Type Resolution ───

/**
 * Resolve the TypeScript type for an arg definition.
 *
 * Priority:
 * 1. If choices are defined → union of choices
 * 2. Else use the declared type (string | number)
 * 3. If required or has default → non-optional
 * 4. Else → T | undefined
 */
export type ResolveArgType<T extends ArgDef> =
	// If has choices, the type is a union of choices
	T extends { choices: readonly (infer C)[] }
		? T extends { required: true }
			? C
			: T extends { default: infer _D }
				? C
				: C | undefined
		: // If type is "number"
			T extends { type: "number" }
			? T extends { required: true }
				? number
				: T extends { default: infer _D }
					? number
					: number | undefined
			: // Default: type is "string"
				T extends { required: true }
				? string
				: T extends { default: infer _D }
					? string
					: string | undefined;

/**
 * Resolve the TypeScript type for a flag definition.
 */
export type ResolveFlagType<T extends FlagDef> = T extends { type: "boolean" }
	? T extends { default: infer _D }
		? boolean
		: boolean | undefined
	: T extends { type: "string" }
		? T extends { choices: readonly (infer C)[] }
			? T extends { required: true }
				? C
				: T extends { default: infer _D }
					? C
					: C | undefined
			: T extends { required: true }
				? string
				: T extends { default: infer _D }
					? string
					: string | undefined
		: T extends { type: "number" }
			? T extends { required: true }
				? number
				: T extends { default: infer _D }
					? number
					: number | undefined
			: T extends { type: "string[]" }
				? T extends { required: true }
					? string[]
					: T extends { default: infer _D }
						? string[]
						: string[] | undefined
				: T extends { type: "number[]" }
					? T extends { required: true }
						? number[]
						: T extends { default: infer _D }
							? number[]
							: number[] | undefined
					: unknown;

// ─── Infer full args/flags objects ───

export type InferArgs<T extends Record<string, ArgDef>> = {
	[K in keyof T]: ResolveArgType<T[K]>;
};

export type InferFlags<T extends Record<string, FlagDef>> = {
	[K in keyof T]: ResolveFlagType<T[K]>;
};

// ─── Factory functions (type-safe constructors) ───

export function arg<
	TType extends ArgType,
	TRequired extends boolean = false,
	TChoices extends readonly string[] | undefined = undefined,
	TDefault extends string | number | undefined = undefined,
>(def: ArgDef<TType, TRequired, TChoices, TDefault>): ArgDef<TType, TRequired, TChoices, TDefault> {
	return def;
}

export function flag<
	TType extends FlagType,
	TRequired extends boolean = false,
	TChoices extends readonly string[] | undefined = undefined,
	TDefault = undefined,
>(
	def: FlagDef<TType, TRequired, TChoices, TDefault>,
): FlagDef<TType, TRequired, TChoices, TDefault> {
	return def;
}
