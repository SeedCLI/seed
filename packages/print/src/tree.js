function renderNode(node, prefix, isLast, isRoot, guides) {
    const lines = [];
    if (isRoot) {
        lines.push(node.label);
    }
    else {
        const connector = guides ? (isLast ? "└── " : "├── ") : "  ";
        lines.push(prefix + connector + node.label);
    }
    if (node.children) {
        const childPrefix = isRoot ? "" : prefix + (guides ? (isLast ? "    " : "│   ") : "  ");
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const childIsLast = i === node.children.length - 1;
            lines.push(...renderNode(child, childPrefix, childIsLast, false, guides));
        }
    }
    return lines;
}
export function tree(root, options) {
    const guides = options?.guides !== false;
    return renderNode(root, "", true, true, guides).join("\n");
}
//# sourceMappingURL=tree.js.map