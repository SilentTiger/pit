import { LinkedList } from "./LinkedList";

export class LinkedListNode<T> {
  public prevSibling: LinkedListNode<T> | null;
  public nextSibling: LinkedListNode<T> | null;
  public value: T | null;
  public parent: LinkedList<T>;

  constructor(value: T, list: LinkedList<T>, prev: LinkedListNode<T>, next: LinkedListNode<T>) {
    this.value = value;
    this.prevSibling = prev;
    this.nextSibling = next;
    this.parent = list;
  }
}
