export interface TreeNode {
    label: string;
    children?: TreeNode[];
}
export interface TreeOptions {
    indent?: number;
    guides?: boolean;
}
export declare function tree(root: TreeNode, options?: TreeOptions): string;
//# sourceMappingURL=tree.d.ts.map