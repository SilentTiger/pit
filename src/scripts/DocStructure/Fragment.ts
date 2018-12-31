import { guid } from '../Common/util';
import FragmentAttributes from './FragmentAttributes';

export default abstract class Fragment {
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
