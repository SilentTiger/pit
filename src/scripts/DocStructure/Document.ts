import {ChainList} from './ChainList';

export default class Document extends ChainList {
  public parent: ChainList;
  constructor() {
    super();
    this.children = [];
  }
}
