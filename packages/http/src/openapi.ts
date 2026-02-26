export async function createOpenAPIClient<_Paths extends {}>(config: {
	baseUrl: string;
	headers?: Record<string, string>;
}): Promise<unknown> {
	try {
		// @ts-expect-error -- openapi-fetch is an optional peer dependency
		const mod = await import("openapi-fetch");
		const createClient = mod.default as (opts: {
			baseUrl: string;
			headers?: Record<string, string>;
		}) => unknown;
		return createClient({
			baseUrl: config.baseUrl,
			headers: config.headers,
		});
	} catch {
		throw new Error(
			"openapi-fetch is required for createOpenAPIClient. Install it with: bun add openapi-fetch",
		);
	}
}
