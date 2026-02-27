export class HttpError extends Error {
	readonly status: number;
	readonly statusText: string;
	readonly data: unknown;
	readonly url?: string;

	constructor(
		status: number,
		statusText: string,
		data?: unknown,
		options?: ErrorOptions & { url?: string },
	) {
		const urlPart = options?.url ? ` for ${options.url}` : "";
		super(`HTTP ${status}${urlPart}: ${statusText}`, options);
		this.name = "HttpError";
		this.status = status;
		this.statusText = statusText;
		this.data = data;
		this.url = options?.url;
	}
}

export class HttpTimeoutError extends Error {
	readonly url: string;
	readonly timeout: number;

	constructor(url: string, timeout: number, options?: ErrorOptions) {
		super(`Request to ${url} timed out after ${timeout}ms`, options);
		this.name = "HttpTimeoutError";
		this.url = url;
		this.timeout = timeout;
	}
}
