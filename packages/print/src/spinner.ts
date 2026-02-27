import ora from "ora";

export interface Spinner {
	text: string;
	succeed(text?: string): void;
	fail(text?: string): void;
	warn(text?: string): void;
	info(text?: string): void;
	stop(): void;
	isSpinning: boolean;
}

/**
 * Create a spinner with the given message.
 */
export function spin(message: string): Spinner {
	const spinner = ora(message).start();

	// Ensure cursor is restored if process exits while spinner is running
	const onExit = () => {
		if (spinner.isSpinning) {
			spinner.stop();
			process.stdout.write("\x1B[?25h"); // show cursor
		}
	};
	process.once("exit", onExit);

	return {
		get text() {
			return spinner.text;
		},
		set text(value: string) {
			spinner.text = value;
		},
		succeed(text?: string) {
			spinner.succeed(text);
			process.removeListener("exit", onExit);
		},
		fail(text?: string) {
			spinner.fail(text);
			process.removeListener("exit", onExit);
		},
		warn(text?: string) {
			spinner.warn(text);
			process.removeListener("exit", onExit);
		},
		info(text?: string) {
			spinner.info(text);
			process.removeListener("exit", onExit);
		},
		stop() {
			spinner.stop();
			process.removeListener("exit", onExit);
		},
		get isSpinning() {
			return spinner.isSpinning;
		},
	};
}
