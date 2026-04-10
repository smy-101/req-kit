/**
 * 在树结构中递归查找指定 id 的节点
 */
export function findInTree<T extends Record<string, any>>(
  tree: T[],
  id: number,
  idKey = 'id' as keyof T,
  childrenKey = 'children' as keyof T
): T | null {
  for (const node of tree) {
    if (node[idKey] === id) return node;
    const children = node[childrenKey] as T[] | undefined;
    if (children) {
      const found = findInTree(children, id, idKey, childrenKey);
      if (found) return found;
    }
  }
  return null;
}
