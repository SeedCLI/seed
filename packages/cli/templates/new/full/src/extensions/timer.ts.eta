import { defineExtension } from "@seedcli/core";

/**
 * Example extension — adds a `timer` helper to the seed context.
 *
 * Extensions run before any command and can attach utilities to the seed context.
 * This file is auto-discovered from the `extensions/` directory.
 *
 * To type the seed context for consumers, declare the module augmentation:
 */
declare module "@seedcli/core" {
	interface SeedExtensions {
		timer: {
			start(): void;
			stop(): string;
		};
	}
}

export default defineExtension({
	name: "timer",
	description: "Simple timing utility",

	setup: (seed) => {
		let startTime = 0;

		seed.timer = {
			start: () => {
				startTime = performance.now();
			},
			stop: () => {
				const elapsed = performance.now() - startTime;
				return `${elapsed.toFixed(0)}ms`;
			},
		};
	},
});
