import nodeOs from "node:os";
export function os() {
    switch (process.platform) {
        case "darwin":
            return "macos";
        case "linux":
            return "linux";
        case "win32":
            return "windows";
        default:
            return "linux";
    }
}
export function arch() {
    const a = process.arch;
    if (a === "x64")
        return "x64";
    if (a === "arm64")
        return "arm64";
    return "arm";
}
export function platform() {
    return process.platform;
}
export function hostname() {
    return nodeOs.hostname();
}
export function cpus() {
    return nodeOs.cpus().length;
}
export function memory() {
    return {
        total: nodeOs.totalmem(),
        free: nodeOs.freemem(),
    };
}
export function uptime() {
    return nodeOs.uptime();
}
//# sourceMappingURL=info.js.map