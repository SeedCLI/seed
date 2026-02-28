import type { Middleware } from "@seedcli/core";

export const timingMiddleware: Middleware = async (seed, next) => {
	const start = performance.now();
	await next();
	const elapsed = (performance.now() - start).toFixed(0);
	seed.print?.muted(`Completed in ${elapsed}ms`);
};
