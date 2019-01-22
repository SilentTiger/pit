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
  private lengthField: number;
  private startField: number;
  constructor() {
    super();
  }

  get start(): number {
    if (isNaN(this.startField)) {
      this.startField = this.prevSibling === null ? 0 : this.prevSibling.start + this.prevSibling.length;
    }
    return this.startField;
  }

  get length(): number {
    if (isNaN(this.lengthField)) {
      this.lengthField = this.children.reduce((sum: number, cur: Fragment) => {
        return sum + cur.length;
      }, 0) + 1; // 最后加 1 是换行符的长度
    }
    return this.lengthField;
  }

  public setAttributes(attr: any) {
    Object.keys(this.attributes).forEach((key) => {
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    });
  }
}
