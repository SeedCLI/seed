export class HttpError extends Error {
    status;
    statusText;
    data;
    constructor(status, statusText, data) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = "HttpError";
        this.status = status;
        this.statusText = statusText;
        this.data = data;
    }
}
export class HttpTimeoutError extends Error {
    url;
    timeout;
    constructor(url, timeout) {
        super(`Request to ${url} timed out after ${timeout}ms`);
        this.name = "HttpTimeoutError";
        this.url = url;
        this.timeout = timeout;
    }
}
//# sourceMappingURL=errors.js.map