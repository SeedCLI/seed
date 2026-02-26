import { checkbox as inquirerCheckbox, confirm as inquirerConfirm, editor as inquirerEditor, input as inquirerInput, number as inquirerNumber, password as inquirerPassword, search as inquirerSearch, select as inquirerSelect, } from "@inquirer/prompts";
import { PromptCancelledError } from "./errors.js";
function normalizeChoices(choices) {
    return choices.map((c) => {
        if (typeof c === "object" && c !== null && "value" in c) {
            return {
                name: c.name ?? String(c.value),
                value: c.value,
                description: c.description,
                disabled: c.disabled,
            };
        }
        return { name: String(c), value: c };
    });
}
function handleError(err) {
    if (err &&
        typeof err === "object" &&
        "name" in err &&
        err.name === "ExitPromptError") {
        throw new PromptCancelledError();
    }
    throw err;
}
export async function input(options) {
    try {
        return await inquirerInput({
            message: options.message,
            default: options.default,
            required: options.required,
            validate: options.validate,
            transformer: options.transformer,
        });
    }
    catch (err) {
        return handleError(err);
    }
}
export async function number(options) {
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
    }
    catch (err) {
        return handleError(err);
    }
}
export async function confirm(options) {
    try {
        return await inquirerConfirm({
            message: options.message,
            default: options.default,
        });
    }
    catch (err) {
        return handleError(err);
    }
}
export async function password(options) {
    try {
        return await inquirerPassword({
            message: options.message,
            mask: options.mask === true ? "*" : options.mask || undefined,
            validate: options.validate,
        });
    }
    catch (err) {
        return handleError(err);
    }
}
export async function editor(options) {
    try {
        return await inquirerEditor({
            message: options.message,
            default: options.default,
            postfix: options.postfix,
            validate: options.validate,
            waitForUserInput: options.waitForUserInput,
        });
    }
    catch (err) {
        return handleError(err);
    }
}
export async function select(options) {
    try {
        return await inquirerSelect({
            message: options.message,
            choices: normalizeChoices(options.choices),
            default: options.default,
            loop: options.loop,
        });
    }
    catch (err) {
        return handleError(err);
    }
}
export async function multiselect(options) {
    try {
        return await inquirerCheckbox({
            message: options.message,
            choices: normalizeChoices(options.choices),
            loop: options.loop,
            required: options.required,
            validate: options.validate
                ? (items) => options.validate(items)
                : undefined,
        });
    }
    catch (err) {
        return handleError(err);
    }
}
export async function autocomplete(options) {
    try {
        return await inquirerSearch({
            message: options.message,
            source: async (input, _opt) => {
                const results = await options.source(input);
                return normalizeChoices(results);
            },
        });
    }
    catch (err) {
        return handleError(err);
    }
}
//# sourceMappingURL=prompts.js.map