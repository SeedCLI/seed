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

	function render(current: number): string {
		const ratio = Math.min(Math.max(current / total, 0), 1);
		const filled = Math.round(width * ratio);
		const empty = width - filled;
		const bar = complete.repeat(filled) + incomplete.repeat(empty);
		const percent = `${Math.round(ratio * 100)}%`;
		const eta = current >= total ? "0s" : "";

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
