import { LinkedListNode } from "./LinkedListNode";

export class LinkedList<T> {
  public readonly children: Array<LinkedListNode<T>> = [];
  public head: LinkedListNode<T> | null = null;
  public tail: LinkedListNode<T> | null = null;

  public add = (item: T) => {
    const node = new LinkedListNode(item, this, this.tail, null);
    if (this.children.length === 0) {
      this.head = node;
    } else {
      this.tail.nextSibling = node;
    }

    this.tail = node;
    this.children.push(node);
  }
}
