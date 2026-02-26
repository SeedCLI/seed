import type { ClientConfig, HttpClient, HttpResponse, RequestOptions } from "./types.js";
export declare function get<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
export declare function post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
export declare function put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
export declare function patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HttpResponse<T>>;
export declare function del<T = unknown>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
export declare function head(url: string, options?: RequestOptions): Promise<HttpResponse<void>>;
export declare function create(config: ClientConfig): HttpClient;
//# sourceMappingURL=client.d.ts.map