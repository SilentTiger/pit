import ChainList from "./ChainList";

export default class ChainListItem {
  public prevSibling: ChainListItem|null;
  public nextSibling: ChainListItem|null;
  public parent: ChainList;
}
