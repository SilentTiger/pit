import { LinkedList } from '../Common/LinkedList';
import { guid } from '../Common/util';
import Fragment from "./Fragment";
import ParagraphAttributes, { ParagraphDefaultAttributes } from './ParagraphAttributes';

export default class Paragraph extends LinkedList<Fragment> {
  public attributes: ParagraphAttributes = { ...ParagraphDefaultAttributes };
  public readonly id: string = guid();
  constructor() {
    super();
  }

  public setAttributes(attr: any) {
    Object.keys(this.attributes).forEach((key) => {
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    });
  }
}
