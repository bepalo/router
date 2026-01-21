"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Tree_root;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tree = exports.TreeNode = void 0;
class TreeNode {
    constructor(value) {
        this.value = value;
        this.children = new Map();
    }
}
exports.TreeNode = TreeNode;
function getTreeObj(node, onHit) {
    const obj = {};
    if (node.value) {
        obj[""] = node.value;
        if (onHit) {
            onHit(node);
        }
    }
    for (const [keyPart, child] of node.children) {
        obj[keyPart] = getTreeObj(child, onHit);
    }
    return obj;
}
class Tree {
    get root() {
        return __classPrivateFieldGet(this, _Tree_root, "f");
    }
    tree(onHit) {
        const tr = __classPrivateFieldGet(this, _Tree_root, "f") ? getTreeObj(__classPrivateFieldGet(this, _Tree_root, "f"), onHit) : {};
        return tr;
    }
    constructor() {
        _Tree_root.set(this, void 0);
    }
    getAll(key) {
        var _a, _b, _c;
        let node = __classPrivateFieldGet(this, _Tree_root, "f");
        const values = [];
        const klen_1 = key.length - 1;
        for (let i = 0; i < key.length && node != null; i++) {
            const keyPart = key[i];
            if (keyPart !== "") {
                const glob = node.children.get("**");
                if ((glob === null || glob === void 0 ? void 0 : glob.value) != null) {
                    values.unshift(glob.value);
                }
            }
            if (i < klen_1) {
                let nextNode = node.children.get(keyPart || "*");
                if (nextNode == null || nextNode.children.size === 0) {
                    nextNode = node.children.get("*");
                }
                node = nextNode;
            }
            else {
                const value = !keyPart
                    ? node.value
                    : (_b = (_a = node.children.get(keyPart)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : (_c = node.children.get("*")) === null || _c === void 0 ? void 0 : _c.value;
                if (value)
                    values.unshift(value);
                break;
            }
        }
        return values;
    }
    get(key) {
        var _a, _b, _c;
        let node = __classPrivateFieldGet(this, _Tree_root, "f");
        const klen_1 = key.length - 1;
        for (let i = 0; i < key.length && node != null; i++) {
            const keyPart = key[i];
            if (i < klen_1) {
                let nextNode = node.children.get(keyPart || "*");
                if (nextNode == null) {
                    nextNode = node.children.get("*");
                }
                node = nextNode;
            }
            else {
                const value = !keyPart
                    ? node.value
                    : (_b = (_a = node.children.get(keyPart)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : (_c = node.children.get("*")) === null || _c === void 0 ? void 0 : _c.value;
                return value;
            }
        }
        return undefined;
    }
    has(key) {
        var _a;
        let node = __classPrivateFieldGet(this, _Tree_root, "f");
        const klen_1 = key.length - 1;
        for (let i = 0; i < key.length && node != null; i++) {
            const keyPart = key[i];
            if (i < klen_1) {
                let nextNode = node.children.get(keyPart || "*");
                if (nextNode == null) {
                    nextNode = node.children.get("*");
                }
                node = nextNode;
            }
            else {
                return !keyPart ? !!node.value : !!((_a = node.children.get(keyPart)) === null || _a === void 0 ? void 0 : _a.value);
            }
        }
        return false;
    }
    set(key, value) {
        if (__classPrivateFieldGet(this, _Tree_root, "f") == null) {
            __classPrivateFieldSet(this, _Tree_root, new TreeNode(), "f");
        }
        let node = __classPrivateFieldGet(this, _Tree_root, "f");
        const klen_1 = key.length - 1;
        for (let i = 0; i < key.length; i++) {
            if (i < klen_1) {
                const keyPart = key[i] || "*";
                const curNode = node.children.get(keyPart);
                if (!curNode) {
                    const newNode = new TreeNode();
                    node.children.set(keyPart, newNode);
                    node = newNode;
                }
                else {
                    node = curNode;
                }
            }
            else {
                const keyPart = key[i];
                if (!keyPart) {
                    node.value = value;
                }
                else {
                    const curNode = node.children.get(keyPart);
                    if (!curNode) {
                        const newNode = new TreeNode(value);
                        node.children.set(keyPart, newNode);
                        node = newNode;
                    }
                    else {
                        curNode.value = value;
                        node = curNode;
                    }
                }
            }
        }
    }
}
exports.Tree = Tree;
_Tree_root = new WeakMap();
exports.default = Tree;
//# sourceMappingURL=tree.js.map