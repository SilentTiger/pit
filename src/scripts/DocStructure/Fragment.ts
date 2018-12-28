import {IChainListItem} from './ChainList';
import FragmentAttributes from './FragmentAttributes';
import Paragraph from "./Paragraph";

export default abstract class Fragment implements IChainListItem {
  public prevSibling: Fragment;
  public nextSibling: Fragment;
  public parent: Paragraph;
  public attributes: FragmentAttributes;

  protected initAttributes(attr: any) {
    Object.keys(this.attributes).forEach((key) => {
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    });
  }
}
