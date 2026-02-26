import type { ExtensionConfig } from "../types/extension.js";
import { ExtensionCycleError } from "./errors.js";

/**
 * Topologically sort extensions by their dependencies using Kahn's algorithm.
 * Extensions with no dependencies come first.
 * Throws ExtensionCycleError if a circular dependency is detected.
 */
export function topoSort(extensions: ExtensionConfig[]): ExtensionConfig[] {
	const byName = new Map<string, ExtensionConfig>();
	for (const ext of extensions) {
		byName.set(ext.name, ext);
	}

	// Build adjacency list and in-degree count
	// Only count dependencies that are in the provided set
	const inDegree = new Map<string, number>();
	const dependents = new Map<string, string[]>(); // dep -> things that depend on it

	for (const ext of extensions) {
		if (!inDegree.has(ext.name)) {
			inDegree.set(ext.name, 0);
		}
		for (const dep of ext.dependencies ?? []) {
			if (byName.has(dep)) {
				inDegree.set(ext.name, (inDegree.get(ext.name) ?? 0) + 1);
				const list = dependents.get(dep) ?? [];
				list.push(ext.name);
				dependents.set(dep, list);
			}
			// deps not in the set are ignored (they may be satisfied externally)
		}
	}

	// Collect nodes with zero in-degree
	const queue: string[] = [];
	for (const [name, degree] of inDegree) {
		if (degree === 0) {
			queue.push(name);
		}
	}

	const sorted: ExtensionConfig[] = [];

	while (queue.length > 0) {
		// biome-ignore lint/style/noNonNullAssertion: queue.length > 0 guarantees shift() returns a value
		const name = queue.shift()!;
		// biome-ignore lint/style/noNonNullAssertion: name was inserted from byName keys
		const ext = byName.get(name)!;
		sorted.push(ext);

		for (const dependent of dependents.get(name) ?? []) {
			const newDegree = (inDegree.get(dependent) ?? 1) - 1;
			inDegree.set(dependent, newDegree);
			if (newDegree === 0) {
				queue.push(dependent);
			}
		}
	}

	if (sorted.length !== extensions.length) {
		const remaining = extensions
			.filter((e) => !sorted.some((s) => s.name === e.name))
			.map((e) => e.name);
		throw new ExtensionCycleError(remaining);
	}

	return sorted;
}
