import { confirm, input, number, password, select } from "./prompts.js";
import type { FormField } from "./types.js";

export async function form<T extends Record<string, unknown>>(
	fields: ReadonlyArray<FormField>,
): Promise<T> {
	const result: Record<string, unknown> = {};

	for (const field of fields) {
		switch (field.type) {
			case "input":
				result[field.name] = await input({
					message: field.message,
					default: field.default as string | undefined,
					validate: field.validate as ((value: string) => boolean | string) | undefined,
				});
				break;
			case "number":
				result[field.name] = await number({
					message: field.message,
					default: field.default as number | undefined,
					validate: field.validate as ((value: number | undefined) => boolean | string) | undefined,
				});
				break;
			case "confirm":
				result[field.name] = await confirm({
					message: field.message,
					default: field.default as boolean | undefined,
				});
				break;
			case "password":
				result[field.name] = await password({
					message: field.message,
					validate: field.validate as ((value: string) => boolean | string) | undefined,
				});
				break;
			case "select":
				result[field.name] = await select({
					message: field.message,
					choices: field.choices ?? [],
					default: field.default,
				});
				break;
			default:
				throw new Error(`Unknown form field type "${field.type}" for field "${field.name}"`);
		}
	}

	return result as T;
}
