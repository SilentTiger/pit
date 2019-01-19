import { ILinkedListNode, LinkedList } from '../Common/LinkedList';
import { guid } from '../Common/util';
import Document from './Document';
import Fragment from "./Fragment";
import ParagraphAttributes, { ParagraphDefaultAttributes } from './ParagraphAttributes';

export default class Paragraph extends LinkedList<Fragment> implements ILinkedListNode {
  public prevSibling: Paragraph;
  public nextSibling: Paragraph;
  public parent: Document;
  public attributes: ParagraphAttributes = { ...ParagraphDefaultAttributes };
  public readonly id: string = guid();
  constructor() {
    super();
  }

  get start(): number {
    return this.prevSibling === null ? 0 : this.prevSibling.start + this.prevSibling.length;
  }

  get length(): number {
    return this.children.reduce((sum: number, cur: Fragment) => {
      return sum + cur.length;
    }, 0) + 1; // 最后加 1 是换行符的长度
  }

  public setAttributes(attr: any) {
    Object.keys(this.attributes).forEach((key) => {
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    });
  }
}
