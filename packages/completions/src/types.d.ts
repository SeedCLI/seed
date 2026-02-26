export type ShellType = "bash" | "zsh" | "fish" | "powershell";
export interface CompletionFlag {
    name: string;
    alias?: string;
    description?: string;
    type: string;
    choices?: readonly string[];
}
export interface CompletionArg {
    name: string;
    description?: string;
    choices?: readonly string[];
}
export interface CompletionCommand {
    name: string;
    description?: string;
    aliases?: string[];
    subcommands?: CompletionCommand[];
    flags?: CompletionFlag[];
    args?: CompletionArg[];
}
export interface CompletionInfo {
    brand: string;
    commands: CompletionCommand[];
}
//# sourceMappingURL=types.d.ts.map