export abstract class ChainList {
  public children: IChainListItem[];
  public head: IChainListItem | null;
  public tail: IChainListItem | null;

  public add = (item: IChainListItem) => {
    if (this.children.length === 0) {
      item.prevSibling = null;
      this.head = item;
    } else {
      item.prevSibling = this.tail;
      this.tail.nextSibling = item;
    }

    this.tail = item;
    item.nextSibling = null;
    item.parent = this;
    this.children.push(item);
  }
}

export interface IChainListItem {
  prevSibling: IChainListItem | null;
  nextSibling: IChainListItem | null;
  parent: ChainList;
}
