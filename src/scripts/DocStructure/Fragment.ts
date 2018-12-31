import { ILinkedListNode } from '../Common/LinkedList';
import { guid } from '../Common/util';
import FragmentAttributes from './FragmentAttributes';
import Paragraph from './Paragraph';

export default abstract class Fragment implements ILinkedListNode {
  public prevSibling: ILinkedListNode;
  public nextSibling: ILinkedListNode;
  public parent: Paragraph;
  public attributes: FragmentAttributes;
  public readonly id: string = guid();

  protected setAttributes(attr: any) {
    Object.keys(this.attributes).forEach((key) => {
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    });
  }
}
