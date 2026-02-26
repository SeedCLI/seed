import { homedir } from "node:os";
import { join } from "node:path";
import { bash } from "./bash.js";
import { detect } from "./detect.js";
import { fish } from "./fish.js";
import { powershell } from "./powershell.js";
import { zsh } from "./zsh.js";
const { appendFile, mkdir } = await import("node:fs/promises");
const GENERATORS = {
    bash,
    zsh,
    fish,
    powershell,
};
function getRcPath(shell, brand) {
    const home = homedir();
    switch (shell) {
        case "bash":
            return join(home, ".bashrc");
        case "zsh":
            return join(home, ".zshrc");
        case "fish":
            return join(home, ".config", "fish", "completions", `${brand}.fish`);
        case "powershell":
            return (process.env.PROFILE ??
                join(home, ".config", "powershell", "Microsoft.PowerShell_profile.ps1"));
    }
}
/**
 * Auto-detect shell, generate completion script, and install to the appropriate rc file.
 */
export async function install(info, shell) {
    const detectedShell = shell ?? detect();
    const script = GENERATORS[detectedShell](info);
    const rcPath = getRcPath(detectedShell, info.brand);
    // Ensure parent directory exists for fish
    if (detectedShell === "fish") {
        const dir = join(homedir(), ".config", "fish", "completions");
        await mkdir(dir, { recursive: true });
    }
    const marker = `# ${info.brand} completions`;
    await appendFile(rcPath, `\n${marker}\n${script}\n`);
    return { shell: detectedShell, path: rcPath };
}
//# sourceMappingURL=install.js.map