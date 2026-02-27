// ─── Arg Definition Types ───

/** Supported arg value types. */
export type ArgType = "string" | "number";

/**
 * Defines a positional argument for a command.
 *
 * @example
 * ```ts
 * const hello = command({
 *   name: "hello",
 *   args: {
 *     name: arg({ type: "string", required: true, description: "Who to greet" }),
 *     count: arg({ type: "number", default: 1 }),
 *   },
 *   run: ({ args }) => console.log(args.name), // fully typed
 * });
 * ```
 */
export interface ArgDef<
	TType extends ArgType = ArgType,
	TRequired extends boolean = boolean,
	TChoices extends readonly string[] | undefined = readonly string[] | undefined,
	TDefault extends string | number | undefined = string | number | undefined,
> {
	/** The value type — "string" or "number". */
	type: TType;
	/** When true, the CLI exits with an error if the argument is missing. */
	required?: TRequired;
	/** Restrict accepted values to this list. Provides autocompletion in shells. */
	choices?: TChoices;
	/** Default value used when the argument is not provided. */
	default?: TDefault;
	/** Description shown in `--help` output. */
	description?: string;
	/** Custom validation. Return `true` to accept, or a string error message to reject. */
	validate?: (value: unknown) => boolean | string;
}

// ─── Flag Definition Types ───

/** Supported flag value types. */
export type FlagType = "boolean" | "string" | "number" | "string[]" | "number[]";

/**
 * Defines a named flag (option) for a command.
 *
 * @example
 * ```ts
 * const deploy = command({
 *   name: "deploy",
 *   flags: {
 *     env: flag({ type: "string", required: true, choices: ["staging", "prod"] as const }),
 *     force: flag({ type: "boolean", alias: "f", description: "Skip confirmation" }),
 *     tags: flag({ type: "string[]", description: "Tags to apply" }),
 *   },
 *   run: ({ flags }) => console.log(flags.env), // "staging" | "prod"
 * });
 * ```
 */
export interface FlagDef<
	TType extends FlagType = FlagType,
	TRequired extends boolean = boolean,
	TChoices extends readonly string[] | undefined = readonly string[] | undefined,
	TDefault = unknown,
> {
	/** The value type — "boolean", "string", "number", "string[]", or "number[]". */
	type: TType;
	/** When true, the CLI exits with an error if the flag is missing. */
	required?: TRequired;
	/** Restrict accepted values to this list (string/number flags only). */
	choices?: TChoices;
	/** Default value used when the flag is not provided. */
	default?: TDefault;
	/** Short alias, e.g. "f" allows `-f` instead of `--force`. */
	alias?: string;
	/** Description shown in `--help` output. */
	description?: string;
	/** When true, the flag is excluded from `--help` output. */
	hidden?: boolean;
	/** Custom validation. Return `true` to accept, or a string error message to reject. */
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
	? T extends { required: true }
		? boolean
		: T extends { default: infer _D }
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
