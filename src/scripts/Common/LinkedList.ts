export abstract class LinkedList<T extends ILinkedListNode> {
  public readonly children: T[] = [];
  public head: T | null = null;
  public tail: T | null = null;

  public add(node: T) {
    if (this.children.length === 0) {
      this.head = node;
    } else {
      this.tail.nextSibling = node;
    }

    node.prevSibling = this.tail;
    this.tail = node;
    this.children.push(node);
    node.parent = this;
  }

  public addBefore(node: T, target: T) {
    const index = this.findLastIndex(target);
    if (index > -1) {
      this.children.splice(index, 0, node);
      if (target.prevSibling !== null) {
        target.prevSibling.nextSibling = node;
        node.prevSibling = target.prevSibling;
      } else {
        this.head = node;
      }
      node.nextSibling = target;
      target.prevSibling = node;
    } else {
      throw new Error("target not exist in this list");
    }
  }

  public addAll(nodes: T[]) {
    for (let index = 0, l = nodes.length; index < l; index++) {
      this.add(nodes[index]);
    }
  }

  public removeAll() {
    this.children.length = 0;
    this.head = null;
    this.tail = null;
  }

  public findLastIndex(node: T) {
    for (let i = this.children.length - 1; i >= 0; i--) {
      if (this.children[i] === node) {
        return i;
      }
    }
    return -1;
  }
}

export interface ILinkedListNode {
  prevSibling: ILinkedListNode | null;
  nextSibling: ILinkedListNode | null;
  parent: LinkedList<ILinkedListNode>;
}
