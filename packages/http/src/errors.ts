export class HttpError extends Error {
	readonly status: number;
	readonly statusText: string;
	readonly data: unknown;

	constructor(status: number, statusText: string, data?: unknown) {
		super(`HTTP ${status}: ${statusText}`);
		this.name = "HttpError";
		this.status = status;
		this.statusText = statusText;
		this.data = data;
	}
}

export class HttpTimeoutError extends Error {
	readonly url: string;
	readonly timeout: number;

	constructor(url: string, timeout: number) {
		super(`Request to ${url} timed out after ${timeout}ms`);
		this.name = "HttpTimeoutError";
		this.url = url;
		this.timeout = timeout;
	}
}
