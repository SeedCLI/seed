import { homedir } from "node:os";
import nodePath from "node:path";
export const path = {
    resolve: (...segments) => nodePath.resolve(...segments),
    join: (...segments) => nodePath.join(...segments),
    dirname: (p) => nodePath.dirname(p),
    basename: (p, ext) => nodePath.basename(p, ext),
    ext: (p) => nodePath.extname(p),
    isAbsolute: (p) => nodePath.isAbsolute(p),
    relative: (from, to) => nodePath.relative(from, to),
    normalize: (p) => nodePath.normalize(p),
    separator: nodePath.sep,
    home: () => homedir(),
    cwd: () => process.cwd(),
};
//# sourceMappingURL=path.js.map