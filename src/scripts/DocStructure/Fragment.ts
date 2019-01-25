import { ILinkedListNode } from '../Common/LinkedList';
import { guid } from '../Common/util';
import FragmentAttributes from './FragmentAttributes';
import Paragraph from './Paragraph';

export default abstract class Fragment implements ILinkedListNode {

  public prevSibling: Fragment;
  public nextSibling: Fragment;
  public parent: Paragraph;
  public attributes: FragmentAttributes;
  public baseline: number;
  public readonly id: string = guid();
  public readonly length: number;

  get start(): number {
    return this.prevSibling === null ? this.parent.start : this.prevSibling.start + this.prevSibling.length;
  }

  public abstract calSize(): {height: number, width: number};

  protected setAttributes(attr: any) {
    const keys = Object.keys(this.attributes);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    }
  }

}
