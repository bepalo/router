export class TreeNode<V> {
  children: Map<string, TreeNode<V>> = new Map();
  constructor(public value?: V) {}
}

type TreeObj<V> = Record<string, V | Record<string, V>>;

function getTreeObj<V>(
  node: TreeNode<V>,
  onHit?: (node: TreeNode<V>) => void
): TreeObj<V> {
  const obj: TreeObj<V> = {};
  if (node.value) {
    obj[""] = node.value;
    if (onHit) {
      onHit(node);
    }
  }
  for (const [keyPart, child] of node.children) {
    obj[keyPart] = getTreeObj(child, onHit) as Record<string, V>;
  }
  return obj;
}

export class Tree<V> {
  #root?: TreeNode<V>;

  get root() {
    return this.#root;
  }

  tree(onHit?: (node: TreeNode<V>) => void): TreeObj<V> {
    const tr: TreeObj<V> = this.#root ? getTreeObj(this.#root, onHit) : {};
    return tr;
  }

  constructor() {}

  getAll(key: Array<string>): Array<V> {
    let node = this.#root;
    const values: Array<V> = [];
    const klen_1 = key.length - 1;
    for (let i = 0; i < key.length && node != null; i++) {
      const keyPart = key[i];
      if (keyPart !== "") {
        const glob = node.children.get("**");
        if (glob?.value != null) {
          values.unshift(glob.value);
        }
      }
      if (i < klen_1) {
        let nextNode = node.children.get(keyPart || "*");
        if (nextNode == null || nextNode.children.size === 0) {
          nextNode = node.children.get("*");
        }
        node = nextNode;
      } else {
        const value = !keyPart
          ? node.value
          : node.children.get(keyPart)?.value ?? node.children.get("*")?.value;
        if (value) values.unshift(value);
        break;
      }
    }
    return values;
  }

  get(key: Array<string>): V | undefined {
    let node = this.#root;
    const klen_1 = key.length - 1;
    for (let i = 0; i < key.length && node != null; i++) {
      const keyPart = key[i];
      if (i < klen_1) {
        let nextNode = node.children.get(keyPart || "*");
        if (nextNode == null) {
          nextNode = node.children.get("*");
        }
        node = nextNode;
      } else {
        const value = !keyPart
          ? node.value
          : node.children.get(keyPart)?.value ?? node.children.get("*")?.value;
        return value;
      }
    }
    return undefined;
  }

  has(key: Array<string>): boolean {
    let node = this.#root;
    const klen_1 = key.length - 1;
    for (let i = 0; i < key.length && node != null; i++) {
      const keyPart = key[i];
      if (i < klen_1) {
        let nextNode = node.children.get(keyPart || "*");
        if (nextNode == null) {
          nextNode = node.children.get("*");
        }
        node = nextNode;
      } else {
        return !keyPart ? !!node.value : !!node.children.get(keyPart)?.value;
      }
    }
    return false;
  }

  set(key: Array<string>, value: V): void {
    if (this.#root == null) {
      this.#root = new TreeNode();
    }
    let node = this.#root;
    const klen_1 = key.length - 1;
    for (let i = 0; i < key.length; i++) {
      if (i < klen_1) {
        const keyPart = key[i] || "*";
        const curNode = node.children.get(keyPart);
        if (!curNode) {
          const newNode = new TreeNode<V>();
          node.children.set(keyPart, newNode);
          node = newNode;
        } else {
          node = curNode;
        }
      } else {
        const keyPart = key[i];
        if (!keyPart) {
          node.value = value;
        } else {
          const curNode = node.children.get(keyPart);
          if (!curNode) {
            const newNode = new TreeNode<V>(value);
            node.children.set(keyPart, newNode);
            node = newNode;
          } else {
            curNode.value = value;
            node = curNode;
          }
        }
      }
    }
  }
}

export default Tree;
