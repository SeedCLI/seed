/**
 * Detect the current shell from environment variables.
 */
export function detect() {
    const shell = process.env.SHELL ?? "";
    if (shell.includes("zsh"))
        return "zsh";
    if (shell.includes("fish"))
        return "fish";
    if (shell.includes("bash"))
        return "bash";
    // Check for PowerShell via PSModulePath
    if (process.env.PSModulePath)
        return "powershell";
    return "bash";
}
//# sourceMappingURL=detect.js.map