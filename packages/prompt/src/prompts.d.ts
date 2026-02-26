import type { AutocompleteOptions, ConfirmOptions, EditorOptions, InputOptions, MultiselectOptions, NumberOptions, PasswordOptions, SelectOptions } from "./types.js";
export declare function input(options: InputOptions): Promise<string>;
export declare function number(options: NumberOptions): Promise<number | undefined>;
export declare function confirm(options: ConfirmOptions): Promise<boolean>;
export declare function password(options: PasswordOptions): Promise<string>;
export declare function editor(options: EditorOptions): Promise<string>;
export declare function select<T = string>(options: SelectOptions<T>): Promise<T>;
export declare function multiselect<T = string>(options: MultiselectOptions<T>): Promise<ReadonlyArray<T>>;
export declare function autocomplete<T = string>(options: AutocompleteOptions<T>): Promise<T>;
//# sourceMappingURL=prompts.d.ts.map