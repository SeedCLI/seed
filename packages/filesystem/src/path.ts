import { homedir } from "node:os";
import nodePath from "node:path";
import type { PathHelpers } from "./types.js";

export const path: PathHelpers = {
	resolve: (...segments: string[]) => nodePath.resolve(...segments),
	join: (...segments: string[]) => nodePath.join(...segments),
	dirname: (p: string) => nodePath.dirname(p),
	basename: (p: string, ext?: string) => nodePath.basename(p, ext),
	ext: (p: string) => nodePath.extname(p),
	isAbsolute: (p: string) => nodePath.isAbsolute(p),
	relative: (from: string, to: string) => nodePath.relative(from, to),
	normalize: (p: string) => nodePath.normalize(p),
	separator: nodePath.sep,
	home: () => homedir(),
	cwd: () => process.cwd(),
};
