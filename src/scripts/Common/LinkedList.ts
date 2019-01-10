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

  public addAll(nodes: T[]) {
    nodes.forEach((node) => {
      this.add(node);
    });
  }

  public removeAll() {
    this.children.length = 0;
    this.head = null;
    this.tail = null;
  }
}

export interface ILinkedListNode {
  prevSibling: ILinkedListNode | null;
  nextSibling: ILinkedListNode | null;
  parent: LinkedList<ILinkedListNode>;
}
