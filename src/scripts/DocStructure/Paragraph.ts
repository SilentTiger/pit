import {ChainList, IChainListItem} from './ChainList';
import Fragment from "./Fragment";
import ParagraphAttributes, { ParagraphDefaultAttributes } from './ParagraphAttributes';

export default class Paragraph extends ChainList implements IChainListItem {
  public prevSibling: Fragment;
  public nextSibling: Fragment;
  public parent: ChainList;
  public attributes: ParagraphAttributes = {...ParagraphDefaultAttributes};
  constructor() {
    super();
    this.children = [];
  }

  public setAttributes(attr: any) {
    Object.keys(this.attributes).forEach((key) => {
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    });
  }
}
