import ChainListItem from "./ChainListItem";

export default abstract class ChainList {
  public children: ChainListItem[];
  public head: ChainListItem | null;
  public tail: ChainListItem|null;

  public add = (item: ChainListItem) => {
    if (this.children.length === 0) {
      item.prevSibling = null;
      this.head = item;
    } else {
      item.prevSibling = this.tail;
    }

    this.tail = item;
    item.nextSibling = null;
    item.parent = this;
    this.children.push(item);
  }
}
