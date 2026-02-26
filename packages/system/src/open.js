import { os } from "./info.js";
export async function open(target) {
    const platform = os();
    let cmd;
    switch (platform) {
        case "macos":
            cmd = ["open", target];
            break;
        case "linux":
            cmd = ["xdg-open", target];
            break;
        case "windows":
            cmd = ["cmd", "/c", "start", "", target];
            break;
    }
    const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
    await proc.exited;
}
//# sourceMappingURL=open.js.map