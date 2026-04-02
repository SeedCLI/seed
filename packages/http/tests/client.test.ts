import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create, get, head, post, put } from "../src/client.js";
import { download } from "../src/download.js";
import { HttpError, HttpTimeoutError } from "../src/errors.js";

let server: Server;
let baseURL: string;

beforeAll(async () => {
	server = createServer(async (req, res) => {
		const url = new URL(req.url!, `http://${req.headers.host}`);

		if (url.pathname === "/json") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ message: "hello", method: req.method }));
			return;
		}
		if (url.pathname === "/text") {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("plain text response");
			return;
		}
		if (url.pathname === "/echo") {
			const chunks: Buffer[] = [];
			for await (const chunk of req) chunks.push(chunk as Buffer);
			const body = JSON.parse(Buffer.concat(chunks).toString());
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ echo: body, method: req.method }));
			return;
		}
		if (url.pathname === "/headers") {
			const headers: Record<string, string> = {};
			for (const [key, value] of Object.entries(req.headers)) {
				if (typeof value === "string") headers[key] = value;
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(headers));
			return;
		}
		if (url.pathname === "/status/404") {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not Found");
			return;
		}
		if (url.pathname === "/status/500") {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "server error" }));
			return;
		}
		if (url.pathname === "/params") {
			const params: Record<string, string> = {};
			url.searchParams.forEach((value, key) => {
				params[key] = value;
			});
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(params));
			return;
		}
		if (url.pathname === "/slow") {
			setTimeout(() => {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ done: true }));
			}, 3000);
			return;
		}
		if (url.pathname === "/download") {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("file content for download test");
			return;
		}

		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not Found");
	});

	await new Promise<void>((resolve) => {
		server.listen(0, () => resolve());
	});
	const addr = server.address();
	const port = typeof addr === "object" && addr ? addr.port : 0;
	baseURL = `http://localhost:${port}`;
});

afterAll(() => {
	server.close();
});

describe("http client", () => {
	test("GET json", async () => {
		const res = await get(`${baseURL}/json`);
		expect(res.ok).toBe(true);
		expect(res.status).toBe(200);
		expect(res.data).toEqual({ message: "hello", method: "GET" });
	});

	test("GET text", async () => {
		const res = await get<string>(`${baseURL}/text`);
		expect(res.data).toBe("plain text response");
	});

	test("POST with body", async () => {
		const res = await post(`${baseURL}/echo`, { name: "test" });
		expect(res.ok).toBe(true);
		expect((res.data as Record<string, unknown>).echo).toEqual({ name: "test" });
		expect((res.data as Record<string, unknown>).method).toBe("POST");
	});

	test("PUT with body", async () => {
		const res = await put(`${baseURL}/echo`, { updated: true });
		expect(res.ok).toBe(true);
		expect((res.data as Record<string, unknown>).method).toBe("PUT");
	});

	test("HEAD request", async () => {
		const res = await head(`${baseURL}/json`);
		expect(res.ok).toBe(true);
		expect(res.status).toBe(200);
	});

	test("query params", async () => {
		const res = await get(`${baseURL}/params`, {
			params: { foo: "bar", num: 42, skip: undefined },
		});
		expect(res.data).toEqual({ foo: "bar", num: "42" });
	});

	test("throws HttpError on 404", async () => {
		try {
			await get(`${baseURL}/status/404`);
			expect(true).toBe(false); // should not reach
		} catch (err) {
			expect(err).toBeInstanceOf(HttpError);
			expect((err as HttpError).status).toBe(404);
		}
	});

	test("throws HttpError on 500 with json data", async () => {
		try {
			await get(`${baseURL}/status/500`);
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpError);
			expect((err as HttpError).status).toBe(500);
			expect((err as HttpError).data).toEqual({ error: "server error" });
		}
	});

	test("throws HttpTimeoutError on timeout", async () => {
		try {
			await get(`${baseURL}/slow`, { timeout: 100 });
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpTimeoutError);
			expect((err as HttpTimeoutError).url).toContain("/slow");
		}
	});
});

describe("http client factory", () => {
	test("create client with baseURL", async () => {
		const client = create({ baseURL });
		const res = await client.get("/json");
		expect(res.ok).toBe(true);
		expect(res.data).toEqual({ message: "hello", method: "GET" });
	});

	test("create client with default headers", async () => {
		const client = create({
			baseURL,
			headers: { "x-custom": "test-value" },
		});
		const res = await client.get<Record<string, string>>("/headers");
		expect(res.data["x-custom"]).toBe("test-value");
	});
});

describe("download", () => {
	let tmpDir: string;

	beforeAll(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "seedcli-http-"));
	});

	afterAll(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test("downloads file", async () => {
		const dest = join(tmpDir, "downloaded.txt");
		await download(`${baseURL}/download`, dest);
		const content = await readFile(dest, "utf-8");
		expect(content).toBe("file content for download test");
	});

	test("reports progress", async () => {
		const dest = join(tmpDir, "progress.txt");
		const progresses: number[] = [];
		await download(`${baseURL}/download`, dest, {
			onProgress: (p) => progresses.push(p.transferred),
		});
		expect(progresses.length).toBeGreaterThan(0);
	});

	test("reports speed in progress", async () => {
		const dest = join(tmpDir, "speed.txt");
		let lastProgress: { speed: number; percent: number } | null = null;
		await download(`${baseURL}/download`, dest, {
			onProgress: (p) => {
				lastProgress = { speed: p.speed, percent: p.percent };
			},
		});
		expect(lastProgress).not.toBeNull();
		expect(typeof lastProgress?.speed).toBe("number");
		expect(typeof lastProgress?.percent).toBe("number");
	});
});

describe("http response raw field", () => {
	test("returns raw Response object", async () => {
		const res = await get(`${baseURL}/json`);
		expect(res.raw).toBeInstanceOf(Response);
	});
});

describe("retry shorthand", () => {
	test("accepts number as retry count", async () => {
		// retry: 0 should work without error (just means no retries)
		const res = await get(`${baseURL}/json`, { retry: 0 });
		expect(res.ok).toBe(true);
	});
});

// ─── Error cause chaining ───

describe("HTTP error cause chaining", () => {
	test("HttpError preserves cause", () => {
		const cause = new Error("network failure");
		const err = new HttpError(500, "Internal Server Error", { detail: "db down" }, { cause });
		expect(err.cause).toBe(cause);
		expect(err.status).toBe(500);
		expect(err.statusText).toBe("Internal Server Error");
		expect(err.data).toEqual({ detail: "db down" });
	});

	test("HttpTimeoutError preserves cause", () => {
		const cause = new DOMException("The operation was aborted", "AbortError");
		const err = new HttpTimeoutError("https://api.example.com/slow", 5000, { cause });
		expect(err.cause).toBe(cause);
		expect(err.url).toBe("https://api.example.com/slow");
		expect(err.timeout).toBe(5000);
	});
});

// ─── Interceptors ───

describe("interceptors", () => {
	test("request interceptor can modify headers", async () => {
		const client = create({
			baseURL,
			interceptors: {
				request: (_url, init) => ({
					...init,
					headers: {
						...(init.headers as Record<string, string>),
						"x-intercepted": "true",
					},
				}),
			},
		});
		const res = await client.get<Record<string, string>>("/headers");
		expect(res.data["x-intercepted"]).toBe("true");
	});

	test("response interceptor throwing propagates the error", async () => {
		const interceptorError = new Error("interceptor rejected response");
		const client = create({
			baseURL,
			interceptors: {
				response: () => {
					throw interceptorError;
				},
			},
		});
		try {
			await client.get("/json");
			expect(true).toBe(false); // should not reach
		} catch (err) {
			expect(err).toBe(interceptorError);
		}
	});

	test("response interceptor can pass through response", async () => {
		const client = create({
			baseURL,
			interceptors: {
				response: (res) => res,
			},
		});
		const res = await client.get("/json");
		expect(res.ok).toBe(true);
		expect(res.data).toEqual({ message: "hello", method: "GET" });
	});
});

// ─── HttpError with URL ───

describe("HttpError with URL", () => {
	test("includes URL in message when provided", () => {
		const err = new HttpError(404, "Not Found", null, { url: "https://api.example.com/users" });
		expect(err.message).toContain("https://api.example.com/users");
		expect(err.message).toContain("404");
	});

	test("url property is set", () => {
		const err = new HttpError(500, "Internal Server Error", null, {
			url: "https://api.example.com/data",
		});
		expect(err.url).toBe("https://api.example.com/data");
	});

	test("works without URL (backward compat)", () => {
		const err = new HttpError(403, "Forbidden", { detail: "access denied" });
		expect(err.message).toContain("403");
		expect(err.message).toContain("Forbidden");
		expect(err.url).toBeUndefined();
		expect(err.status).toBe(403);
		expect(err.data).toEqual({ detail: "access denied" });
	});

	test("works with empty options (no url key)", () => {
		const err = new HttpError(400, "Bad Request", null, {});
		expect(err.url).toBeUndefined();
		expect(err.message).not.toContain("for ");
	});

	test("URL in message follows format: HTTP {status} for {url}: {statusText}", () => {
		const err = new HttpError(422, "Unprocessable Entity", null, {
			url: "https://api.test.com/submit",
		});
		expect(err.message).toBe("HTTP 422 for https://api.test.com/submit: Unprocessable Entity");
	});

	test("no URL in message follows format: HTTP {status}: {statusText}", () => {
		const err = new HttpError(503, "Service Unavailable");
		expect(err.message).toBe("HTTP 503: Service Unavailable");
	});
});

// ─── Already-aborted signal ───

describe("already-aborted signal", () => {
	test("rejects immediately with an already-aborted signal", async () => {
		const controller = new AbortController();
		controller.abort("pre-aborted");
		try {
			await get(`${baseURL}/json`, { signal: controller.signal, timeout: 5000 });
			expect(true).toBe(false); // should not reach
		} catch (err) {
			// Should throw an abort-related error, not a timeout
			expect(err).toBeDefined();
			expect(err).not.toBeInstanceOf(HttpTimeoutError);
		}
	});
});
