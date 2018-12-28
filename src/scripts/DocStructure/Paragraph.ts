import {ChainList} from './ChainList';
import Fragment from "./Fragment";
import IChainListItem from './IChainListItem';

export default class Paragraph extends ChainList implements IChainListItem {
  public prevSibling: Fragment;
  public nextSibling: Fragment;
  public parent: ChainList;
  constructor() {
    super();
    this.children = [];
  }
}
