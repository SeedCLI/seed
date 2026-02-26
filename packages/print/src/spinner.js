import ora from "ora";
/**
 * Create a spinner with the given message.
 */
export function spin(message) {
    const spinner = ora(message).start();
    return {
        get text() {
            return spinner.text;
        },
        set text(value) {
            spinner.text = value;
        },
        succeed(text) {
            spinner.succeed(text);
        },
        fail(text) {
            spinner.fail(text);
        },
        warn(text) {
            spinner.warn(text);
        },
        info(text) {
            spinner.info(text);
        },
        stop() {
            spinner.stop();
        },
        get isSpinning() {
            return spinner.isSpinning;
        },
    };
}
//# sourceMappingURL=spinner.js.map