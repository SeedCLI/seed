import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "bun";
import { create, get, head, post, put } from "../src/client.js";
import { download } from "../src/download.js";
import { HttpError, HttpTimeoutError } from "../src/errors.js";

let server: Server;
let baseURL: string;

beforeAll(() => {
	server = Bun.serve({
		port: 0,
		fetch(req) {
			const url = new URL(req.url);

			if (url.pathname === "/json") {
				return Response.json({ message: "hello", method: req.method });
			}
			if (url.pathname === "/text") {
				return new Response("plain text response");
			}
			if (url.pathname === "/echo") {
				return req.json().then((body) => Response.json({ echo: body, method: req.method }));
			}
			if (url.pathname === "/headers") {
				const headers: Record<string, string> = {};
				req.headers.forEach((value, key) => {
					headers[key] = value;
				});
				return Response.json(headers);
			}
			if (url.pathname === "/status/404") {
				return new Response("Not Found", { status: 404 });
			}
			if (url.pathname === "/status/500") {
				return Response.json({ error: "server error" }, { status: 500 });
			}
			if (url.pathname === "/params") {
				const params: Record<string, string> = {};
				url.searchParams.forEach((value, key) => {
					params[key] = value;
				});
				return Response.json(params);
			}
			if (url.pathname === "/slow") {
				return new Promise((resolve) =>
					setTimeout(() => resolve(Response.json({ done: true })), 3000),
				);
			}
			if (url.pathname === "/download") {
				return new Response("file content for download test");
			}

			return new Response("Not Found", { status: 404 });
		},
	});
	baseURL = `http://localhost:${server.port}`;
});

afterAll(() => {
	server.stop(true);
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
		const content = await Bun.file(dest).text();
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
