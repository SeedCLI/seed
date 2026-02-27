import { HttpError, HttpTimeoutError } from "./errors.js";
import type {
	ClientConfig,
	HttpClient,
	HttpResponse,
	RequestOptions,
	RetryConfig,
} from "./types.js";

const DEFAULT_RETRY_ON = [408, 429, 500, 502, 503, 504];

function normalizeRetry(retry: number | RetryConfig | undefined): RetryConfig | undefined {
	if (retry === undefined) return undefined;
	if (typeof retry === "number") {
		return { count: retry, delay: 1000 };
	}
	return retry;
}

function serializeParams(params: Record<string, string | number | boolean | undefined>): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined);
	if (entries.length === 0) return "";
	const searchParams = new URLSearchParams();
	for (const [key, value] of entries) {
		searchParams.set(key, String(value));
	}
	return `?${searchParams.toString()}`;
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeout?: number,
): Promise<Response> {
	if (!timeout) return fetch(url, init);

	const controller = new AbortController();
	const existingSignal = init.signal;

	const onAbort = existingSignal ? () => controller.abort(existingSignal.reason) : undefined;
	if (existingSignal && onAbort) {
		existingSignal.addEventListener("abort", onAbort);
		// Handle already-aborted signal
		if (existingSignal.aborted) {
			controller.abort(existingSignal.reason);
		}
	}

	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const response = await fetch(url, { ...init, signal: controller.signal });
		return response;
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError" && !existingSignal?.aborted) {
			throw new HttpTimeoutError(url, timeout);
		}
		throw err;
	} finally {
		clearTimeout(timer);
		if (existingSignal && onAbort) {
			existingSignal.removeEventListener("abort", onAbort);
		}
	}
}

async function fetchWithRetry(
	url: string,
	init: RequestInit,
	timeout?: number,
	retry?: RetryConfig,
): Promise<Response> {
	if (!retry || retry.count <= 0) {
		return fetchWithTimeout(url, init, timeout);
	}

	const { count, delay, backoff = "exponential", retryOn = DEFAULT_RETRY_ON, onRetry } = retry;
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= count; attempt++) {
		try {
			const response = await fetchWithTimeout(url, init, timeout);

			// Check if we should retry based on status code
			if (!response.ok && attempt < count && retryOn.includes(response.status)) {
				// Drain the body to release the connection
				await response.body?.cancel();
				onRetry?.(
					new HttpError(response.status, response.statusText, undefined, { url }),
					attempt + 1,
				);
				const waitTime = backoff === "linear" ? delay * (attempt + 1) : delay * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, waitTime));
				continue;
			}

			return response;
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err), { cause: err });
			if (attempt < count) {
				onRetry?.(lastError, attempt + 1);
				const waitTime = backoff === "linear" ? delay * (attempt + 1) : delay * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}
	}

	throw lastError ?? new Error(`Request failed after ${count} retry attempts`);
}

function buildURL(
	base: string | undefined,
	path: string,
	params?: Record<string, string | number | boolean | undefined>,
): string {
	let url = base ? `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : path;
	if (params) {
		const paramStr = serializeParams(params);
		if (paramStr) {
			// Use & if URL already has query params, otherwise use ?
			url += url.includes("?") ? `&${paramStr.slice(1)}` : paramStr;
		}
	}
	return url;
}

async function request<T>(
	method: string,
	url: string,
	config: ClientConfig,
	body?: unknown,
	options?: RequestOptions,
): Promise<HttpResponse<T>> {
	const fullURL = buildURL(config.baseURL, url, options?.params);
	const mergedHeaders: Record<string, string> = {
		...config.headers,
		...options?.headers,
	};

	const hasContentType = Object.keys(mergedHeaders).some((k) => k.toLowerCase() === "content-type");

	// Determine if body should be passed through directly (FormData, Blob, etc.)
	// or serialized as JSON
	let serializedBody: BodyInit | undefined;
	if (body === undefined || body === null) {
		serializedBody = undefined;
	} else if (
		body instanceof FormData ||
		body instanceof Blob ||
		body instanceof ArrayBuffer ||
		body instanceof URLSearchParams ||
		body instanceof ReadableStream ||
		typeof body === "string"
	) {
		// Pass through native BodyInit types directly — don't JSON.stringify them
		serializedBody = body as BodyInit;
	} else {
		// Plain objects/arrays — serialize as JSON
		if (!hasContentType) {
			mergedHeaders["Content-Type"] = "application/json";
		}
		serializedBody = JSON.stringify(body);
	}

	let init: RequestInit = {
		method,
		headers: mergedHeaders,
		body: serializedBody,
		signal: options?.signal,
	};

	if (config.interceptors?.request) {
		init = await config.interceptors.request(fullURL, init);
	}

	const timeout = options?.timeout ?? config.timeout;
	const retry = normalizeRetry(options?.retry ?? config.retry);

	const response = await fetchWithRetry(fullURL, init, timeout, retry);

	let processed = response;
	if (config.interceptors?.response) {
		try {
			processed = await config.interceptors.response(processed);
		} catch (err) {
			await response.body?.cancel();
			throw err;
		}
	}

	if (!processed.ok) {
		let errorData: unknown;
		try {
			const errorText = await processed.text();
			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = errorText || undefined;
			}
		} catch {
			errorData = undefined;
		}
		throw new HttpError(processed.status, processed.statusText, errorData, { url: fullURL });
	}

	let data: T;
	const contentType = processed.headers.get("content-type") ?? "";
	if (method === "HEAD") {
		data = undefined as T;
	} else if (contentType.includes("application/json")) {
		data = (await processed.json()) as T;
	} else {
		data = (await processed.text()) as unknown as T;
	}

	return {
		data,
		status: processed.status,
		statusText: processed.statusText,
		headers: processed.headers,
		ok: processed.ok,
		raw: processed,
	};
}

function createClient(config: ClientConfig): HttpClient {
	return {
		get: <T = unknown>(url: string, options?: RequestOptions) =>
			request<T>("GET", url, config, undefined, options),
		post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
			request<T>("POST", url, config, body, options),
		put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
			request<T>("PUT", url, config, body, options),
		patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
			request<T>("PATCH", url, config, body, options),
		delete: <T = unknown>(url: string, options?: RequestOptions) =>
			request<T>("DELETE", url, config, undefined, options),
		head: (url: string, options?: RequestOptions) =>
			request<void>("HEAD", url, config, undefined, options),
	};
}

const defaultConfig: ClientConfig = {};

export async function get<T = unknown>(
	url: string,
	options?: RequestOptions,
): Promise<HttpResponse<T>> {
	return request<T>("GET", url, defaultConfig, undefined, options);
}

export async function post<T = unknown>(
	url: string,
	body?: unknown,
	options?: RequestOptions,
): Promise<HttpResponse<T>> {
	return request<T>("POST", url, defaultConfig, body, options);
}

export async function put<T = unknown>(
	url: string,
	body?: unknown,
	options?: RequestOptions,
): Promise<HttpResponse<T>> {
	return request<T>("PUT", url, defaultConfig, body, options);
}

export async function patch<T = unknown>(
	url: string,
	body?: unknown,
	options?: RequestOptions,
): Promise<HttpResponse<T>> {
	return request<T>("PATCH", url, defaultConfig, body, options);
}

// Named 'del' internally but exported as 'delete' via index
export async function del<T = unknown>(
	url: string,
	options?: RequestOptions,
): Promise<HttpResponse<T>> {
	return request<T>("DELETE", url, defaultConfig, undefined, options);
}

export async function head(url: string, options?: RequestOptions): Promise<HttpResponse<void>> {
	return request<void>("HEAD", url, defaultConfig, undefined, options);
}

export function create(config: ClientConfig): HttpClient {
	return createClient(config);
}
