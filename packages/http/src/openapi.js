export async function createOpenAPIClient(config) {
    try {
        // @ts-expect-error -- openapi-fetch is an optional peer dependency
        const mod = await import("openapi-fetch");
        const createClient = mod.default;
        return createClient({
            baseUrl: config.baseUrl,
            headers: config.headers,
        });
    }
    catch {
        throw new Error("openapi-fetch is required for createOpenAPIClient. Install it with: bun add openapi-fetch");
    }
}
//# sourceMappingURL=openapi.js.map