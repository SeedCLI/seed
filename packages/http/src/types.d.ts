export interface RetryConfig {
    count: number;
    delay: number;
    backoff?: "linear" | "exponential";
    retryOn?: number[];
    onRetry?: (error: Error, attempt: number) => void;
}
export interface ClientConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retry?: number | RetryConfig;
    interceptors?: {
        request?: (url: string, init: RequestInit) => RequestInit | Promise<RequestInit>;
        response?: (response: Response) => Response | Promise<Response>;
    };
}
export interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
    timeout?: number;
    retry?: number | RetryConfig;
    signal?: AbortSignal;
}
export interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    ok: boolean;
    raw: Response;
}
export interface DownloadProgress {
    percent: number;
    transferred: number;
    total: number | null;
    speed: number;
}
export interface DownloadOptions {
    headers?: Record<string, string>;
    onProgress?: (progress: DownloadProgress) => void;
    signal?: AbortSignal;
}
export interface HttpClient {
    get<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
    post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
    put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
    patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
    delete<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
    head(url: string, options?: RequestOptions): Promise<HttpResponse<void>>;
}
export interface HttpModule extends HttpClient {
    create(config: ClientConfig): HttpClient;
    download(url: string, dest: string, options?: DownloadOptions): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map