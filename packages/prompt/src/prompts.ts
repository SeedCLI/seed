import {
	checkbox as inquirerCheckbox,
	confirm as inquirerConfirm,
	editor as inquirerEditor,
	input as inquirerInput,
	number as inquirerNumber,
	password as inquirerPassword,
	search as inquirerSearch,
	select as inquirerSelect,
} from "@inquirer/prompts";
import { PromptCancelledError } from "./errors.js";
import type {
	AutocompleteOptions,
	Choice,
	ConfirmOptions,
	EditorOptions,
	InputOptions,
	MultiselectOptions,
	NumberOptions,
	PasswordOptions,
	SelectOptions,
} from "./types.js";

function normalizeChoices<T>(choices: ReadonlyArray<Choice<T> | T>): Array<{
	name: string;
	value: T;
	description?: string;
	disabled?: boolean | string;
}> {
	return choices.map((c) => {
		if (typeof c === "object" && c !== null && "value" in c) {
			return {
				name: c.name ?? String(c.value),
				value: c.value,
				description: c.description,
				disabled: c.disabled,
			};
		}
		return { name: String(c), value: c as T };
	});
}

function handleError(err: unknown): never {
	if (
		err &&
		typeof err === "object" &&
		"name" in err &&
		(err as Error).name === "ExitPromptError"
	) {
		throw new PromptCancelledError();
	}
	throw err;
}

export async function input(options: InputOptions): Promise<string> {
	try {
		return await inquirerInput({
			message: options.message,
			default: options.default,
			required: options.required,
			validate: options.validate,
			transformer: options.transformer,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function number(options: NumberOptions): Promise<number | undefined> {
	try {
		return await inquirerNumber({
			message: options.message,
			default: options.default,
			min: options.min,
			max: options.max,
			step: options.step,
			required: options.required,
			validate: options.validate,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function confirm(options: ConfirmOptions): Promise<boolean> {
	try {
		return await inquirerConfirm({
			message: options.message,
			default: options.default,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function password(options: PasswordOptions): Promise<string> {
	try {
		return await inquirerPassword({
			message: options.message,
			mask: options.mask === true ? "*" : options.mask || undefined,
			validate: options.validate,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function editor(options: EditorOptions): Promise<string> {
	try {
		return await inquirerEditor({
			message: options.message,
			default: options.default,
			postfix: options.postfix,
			validate: options.validate,
			waitForUserInput: options.waitForUserInput,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function select<T = string>(options: SelectOptions<T>): Promise<T> {
	try {
		return await inquirerSelect<T>({
			message: options.message,
			choices: normalizeChoices(options.choices),
			default: options.default,
			loop: options.loop,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function multiselect<T = string>(
	options: MultiselectOptions<T>,
): Promise<ReadonlyArray<T>> {
	try {
		return await inquirerCheckbox<T>({
			message: options.message,
			choices: normalizeChoices(options.choices),
			loop: options.loop,
			required: options.required,
			validate: options.validate
				? (items: unknown) =>
						(options.validate as (value: ReadonlyArray<T>) => boolean | string)(
							items as ReadonlyArray<T>,
						)
				: undefined,
		});
	} catch (err) {
		return handleError(err);
	}
}

export async function autocomplete<T = string>(options: AutocompleteOptions<T>): Promise<T> {
	try {
		return await inquirerSearch<T>({
			message: options.message,
			source: async (input, _opt) => {
				const results = await options.source(input);
				return normalizeChoices(results);
			},
		});
	} catch (err) {
		return handleError(err);
	}
}
