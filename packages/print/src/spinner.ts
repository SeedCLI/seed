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

	return {
		get text() {
			return spinner.text;
		},
		set text(value: string) {
			spinner.text = value;
		},
		succeed(text?: string) {
			spinner.succeed(text);
		},
		fail(text?: string) {
			spinner.fail(text);
		},
		warn(text?: string) {
			spinner.warn(text);
		},
		info(text?: string) {
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
