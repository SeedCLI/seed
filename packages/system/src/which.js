export class ExecutableNotFoundError extends Error {
    execName;
    constructor(name) {
        super(`Executable not found: ${name}\nMake sure ${name} is installed and available in your PATH.`);
        this.name = "ExecutableNotFoundError";
        this.execName = name;
    }
}
export async function which(name) {
    const result = Bun.which(name);
    return result ?? undefined;
}
export async function whichOrThrow(name) {
    const result = Bun.which(name);
    if (!result) {
        throw new ExecutableNotFoundError(name);
    }
    return result;
}
//# sourceMappingURL=which.js.map