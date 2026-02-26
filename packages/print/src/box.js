import boxen from "boxen";
export function box(text, options) {
    const opts = {
        borderStyle: options?.borderStyle ?? "round",
    };
    if (options?.title !== undefined)
        opts.title = options.title;
    if (options?.titleAlignment !== undefined)
        opts.titleAlignment = options.titleAlignment;
    if (options?.padding !== undefined)
        opts.padding = options.padding;
    if (options?.margin !== undefined)
        opts.margin = options.margin;
    if (options?.borderColor !== undefined)
        opts.borderColor = options.borderColor;
    if (options?.backgroundColor !== undefined)
        opts.backgroundColor = options.backgroundColor;
    if (options?.textAlignment !== undefined)
        opts.textAlignment = options.textAlignment;
    if (options?.width !== undefined)
        opts.width = options.width;
    if (options?.fullscreen !== undefined)
        opts.fullscreen = options.fullscreen;
    if (options?.dimBorder !== undefined)
        opts.dimBorder = options.dimBorder;
    if (options?.float !== undefined)
        opts.float = options.float;
    return boxen(text, opts);
}
//# sourceMappingURL=box.js.map