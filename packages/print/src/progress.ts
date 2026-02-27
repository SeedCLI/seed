export interface ProgressBarOptions {
	total: number;
	width?: number;
	complete?: string;
	incomplete?: string;
	format?: string;
}

export interface ProgressBar {
	update(current: number): string;
	done(): string;
}

export function progressBar(options: ProgressBarOptions): ProgressBar {
	const { total, width = 30, complete = "█", incomplete = "░" } = options;
	const format = options.format ?? ":bar :percent";
	let startTime: number | undefined;

	function render(current: number): string {
		if (startTime === undefined && current > 0) {
			startTime = Date.now();
		}

		const ratio = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;
		const filled = Math.round(width * ratio);
		const empty = width - filled;
		const bar = complete.repeat(filled) + incomplete.repeat(empty);
		const percent = `${Math.round(ratio * 100)}%`;

		let eta = "";
		if (current >= total) {
			eta = "0s";
		} else if (startTime !== undefined && current > 0) {
			const elapsed = (Date.now() - startTime) / 1000;
			const rate = current / elapsed;
			const remaining = Math.ceil((total - current) / rate);
			eta = remaining >= 60 ? `${Math.floor(remaining / 60)}m${remaining % 60}s` : `${remaining}s`;
		}

		return format
			.replace(":bar", bar)
			.replace(":percent", percent)
			.replace(":current", String(current))
			.replace(":total", String(total))
			.replace(":eta", eta);
	}

	return {
		update(current: number): string {
			return render(current);
		},
		done(): string {
			return render(total);
		},
	};
}
