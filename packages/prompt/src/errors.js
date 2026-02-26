export class PromptCancelledError extends Error {
    constructor(message = "Prompt was cancelled") {
        super(message);
        this.name = "PromptCancelledError";
    }
}
//# sourceMappingURL=errors.js.map