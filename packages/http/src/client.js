import { HttpError, HttpTimeoutError } from "./errors.js";
const DEFAULT_RETRY_ON = [408, 429, 500, 502, 503, 504];
function normalizeRetry(retry) {
    if (retry === undefined)
        return undefined;
    if (typeof retry === "number") {
        return { count: retry, delay: 1000 };
    }
    return retry;
}
function serializeParams(params) {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined);
    if (entries.length === 0)
        return "";
    const searchParams = new URLSearchParams();
    for (const [key, value] of entries) {
        searchParams.set(key, String(value));
    }
    return `?${searchParams.toString()}`;
}
async function fetchWithTimeout(url, init, timeout) {
    if (!timeout)
        return fetch(url, init);
    const controller = new AbortController();
    const existingSignal = init.signal;
    if (existingSignal) {
        existingSignal.addEventListener("abort", () => controller.abort(existingSignal.reason));
    }
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        return response;
    }
    catch (err) {
        if (err instanceof DOMException && err.name === "AbortError" && !existingSignal?.aborted) {
            throw new HttpTimeoutError(url, timeout);
        }
        throw err;
    }
    finally {
        clearTimeout(timer);
    }
}
async function fetchWithRetry(url, init, timeout, retry) {
    if (!retry || retry.count <= 0) {
        return fetchWithTimeout(url, init, timeout);
    }
    const { count, delay, backoff = "exponential", retryOn = DEFAULT_RETRY_ON, onRetry } = retry;
    let lastError;
    for (let attempt = 0; attempt <= count; attempt++) {
        try {
            const response = await fetchWithTimeout(url, init, timeout);
            // Check if we should retry based on status code
            if (!response.ok && attempt < count && retryOn.includes(response.status)) {
                onRetry?.(new HttpError(response.status, response.statusText), attempt + 1);
                const waitTime = backoff === "linear" ? delay * (attempt + 1) : delay * 2 ** attempt;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }
            return response;
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < count) {
                onRetry?.(lastError, attempt + 1);
                const waitTime = backoff === "linear" ? delay * (attempt + 1) : delay * 2 ** attempt;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }
    throw lastError;
}
function buildURL(base, path, params) {
    let url = base ? `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : path;
    if (params) {
        url += serializeParams(params);
    }
    return url;
}
async function request(method, url, config, body, options) {
    const fullURL = buildURL(config.baseURL, url, options?.params);
    const mergedHeaders = {
        ...config.headers,
        ...options?.headers,
    };
    if (body !== undefined &&
        body !== null &&
        !mergedHeaders["content-type"] &&
        !mergedHeaders["Content-Type"]) {
        mergedHeaders["Content-Type"] = "application/json";
    }
    let init = {
        method,
        headers: mergedHeaders,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
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
        processed = await config.interceptors.response(processed);
    }
    if (!processed.ok) {
        let errorData;
        try {
            errorData = await processed.clone().json();
        }
        catch {
            try {
                errorData = await processed.clone().text();
            }
            catch {
                errorData = undefined;
            }
        }
        throw new HttpError(processed.status, processed.statusText, errorData);
    }
    let data;
    const contentType = processed.headers.get("content-type") ?? "";
    if (method === "HEAD") {
        data = undefined;
    }
    else if (contentType.includes("application/json")) {
        data = (await processed.json());
    }
    else {
        data = (await processed.text());
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
function createClient(config) {
    return {
        get: (url, options) => request("GET", url, config, undefined, options),
        post: (url, body, options) => request("POST", url, config, body, options),
        put: (url, body, options) => request("PUT", url, config, body, options),
        patch: (url, body, options) => request("PATCH", url, config, body, options),
        delete: (url, options) => request("DELETE", url, config, undefined, options),
        head: (url, options) => request("HEAD", url, config, undefined, options),
    };
}
const defaultConfig = {};
export async function get(url, options) {
    return request("GET", url, defaultConfig, undefined, options);
}
export async function post(url, body, options) {
    return request("POST", url, defaultConfig, body, options);
}
export async function put(url, body, options) {
    return request("PUT", url, defaultConfig, body, options);
}
export async function patch(url, body, options) {
    return request("PATCH", url, defaultConfig, body, options);
}
// Named 'del' internally but exported as 'delete' via index
export async function del(url, options) {
    return request("DELETE", url, defaultConfig, undefined, options);
}
export async function head(url, options) {
    return request("HEAD", url, defaultConfig, undefined, options);
}
export function create(config) {
    return createClient(config);
}
//# sourceMappingURL=client.js.map