import { confirm, input, number, password, select } from "./prompts.js";
export async function form(fields) {
    const result = {};
    for (const field of fields) {
        switch (field.type) {
            case "input":
                result[field.name] = await input({
                    message: field.message,
                    default: field.default,
                    validate: field.validate,
                });
                break;
            case "number":
                result[field.name] = await number({
                    message: field.message,
                    default: field.default,
                    validate: field.validate,
                });
                break;
            case "confirm":
                result[field.name] = await confirm({
                    message: field.message,
                    default: field.default,
                });
                break;
            case "password":
                result[field.name] = await password({
                    message: field.message,
                    validate: field.validate,
                });
                break;
            case "select":
                result[field.name] = await select({
                    message: field.message,
                    choices: field.choices ?? [],
                    default: field.default,
                });
                break;
        }
    }
    return result;
}
//# sourceMappingURL=form.js.map