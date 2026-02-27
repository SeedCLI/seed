import type { Client, ClientOptions } from "openapi-fetch";

export async function createOpenAPIClient<Paths extends Record<string, unknown>>(
	options: ClientOptions,
): Promise<Client<Paths>> {
	try {
		const mod = await import("openapi-fetch");
		const createClient = mod.default as <P extends Record<string, unknown>>(
			opts?: ClientOptions,
		) => Client<P>;
		return createClient<Paths>(options);
	} catch (err) {
		const isModuleNotFound =
			err instanceof Error &&
			("code" in err ? (err as { code: string }).code === "ERR_MODULE_NOT_FOUND" : false);
		if (isModuleNotFound) {
			throw new Error(
				"openapi-fetch is required for createOpenAPIClient. Install it with: bun add openapi-fetch",
				{ cause: err },
			);
		}
		throw new Error(
			`Failed to load openapi-fetch: ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}
