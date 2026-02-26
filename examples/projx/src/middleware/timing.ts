import type { Middleware } from "@seedcli/core";

export const timingMiddleware: Middleware = async (toolbox, next) => {
	const start = performance.now();
	await next();
	const elapsed = (performance.now() - start).toFixed(0);
	toolbox.print?.muted(`Completed in ${elapsed}ms`);
};
