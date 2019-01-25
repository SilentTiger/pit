import { ILinkedListNode, LinkedList } from '../Common/LinkedList';
import { guid } from '../Common/util';
import Document from './Document';
import Fragment from "./Fragment";
import ParagraphAttributes, { ParagraphDefaultAttributes } from './ParagraphAttributes';

const EnumLineSpacing = new Map();
EnumLineSpacing.set('100', 1.7);
EnumLineSpacing.set('115', 2);
EnumLineSpacing.set('150', 2.5);
EnumLineSpacing.set('200', 3.4);
EnumLineSpacing.set('250', 4.3);
EnumLineSpacing.set('300', 5.1);

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
    const keys = Object.keys(this.attributes);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    }
    if (attr.linespacing !== undefined) {
      const ls =  EnumLineSpacing.get(attr.linespacing);
      if (!isNaN(ls)) {
        this.attributes.linespacing = ls;
      }
    }
  }
}
