/**
 * Display a countdown timer, updating in-place.
 * Returns a promise that resolves when the countdown reaches zero.
 */
export function countdown(seconds: number, label?: string): Promise<void> {
	if (seconds <= 0) return Promise.resolve();

	return new Promise((resolve) => {
		let remaining = seconds;

		const render = () => {
			const text = label ? `${label} ${remaining}s` : `${remaining}s`;
			process.stdout.write(`\r${text}  `);
		};

		render();

		const interval = setInterval(() => {
			remaining--;
			render();

			if (remaining <= 0) {
				clearInterval(interval);
				process.stdout.write(`\r${" ".repeat((label?.length ?? 0) + 10)}\r`);
				resolve();
			}
		}, 1000);
	});
}
