export declare class TreeNode<V> {
    value?: V | undefined;
    children: Map<string, TreeNode<V>>;
    constructor(value?: V | undefined);
}
type TreeObj<V> = Record<string, V | Record<string, V>>;
export declare class Tree<V> {
    #private;
    get root(): TreeNode<V> | undefined;
    tree(onHit?: (node: TreeNode<V>) => void): TreeObj<V>;
    constructor();
    getAll(key: Array<string>): Array<V>;
    get(key: Array<string>): V | undefined;
    has(key: Array<string>): boolean;
    set(key: Array<string>, value: V): void;
}
export default Tree;
//# sourceMappingURL=tree.d.ts.map