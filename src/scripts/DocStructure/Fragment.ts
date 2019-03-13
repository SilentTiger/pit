import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import { ILinkedListNode } from '../Common/LinkedList';
import { guid } from '../Common/util';
import IFragmentAttributes, {FragmentDefaultAttributes} from './FragmentAttributes';
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes';
import LayoutFrame from './LayoutFrame';

export default abstract class Fragment implements ILinkedListNode {
  get start(): number {
    return this.prevSibling === null
      ? 0
      : this.prevSibling.start + this.prevSibling.length;
  }

  public prevSibling: Fragment = null;
  public nextSibling: Fragment = null;
  public parent: LayoutFrame;
  public attributes: IFragmentAttributes;
  public metrics: IFragmentMetrics;
  public readonly id: string = guid();
  public readonly length: number;

  protected defaultAttributes: IFragmentAttributes = {...FragmentDefaultAttributes};
  private ownAttributes: any = {};
  private defaultOverwriteAttributes: IFragmentOverwriteAttributes;
  private overwriteAttributes: IFragmentOverwriteAttributes;

  public destroy() {}

  /**
   * 计算当前 fragment 的宽度和高度
   */
  public abstract calSize(): { height: number; width: number };
  /**
   * 计算当前 fragment 的 metrics
   */
  public abstract calMetrics(): void;

  public setAttributes(attrs: {
    ownAttributes?: any;
    defaultOverwriteAttributes?: IFragmentOverwriteAttributes;
    overwriteAttributes?: IFragmentOverwriteAttributes;
  }) {
    if (attrs.ownAttributes !== undefined) {
      this.ownAttributes = attrs.ownAttributes;
    }
    if (attrs.defaultOverwriteAttributes !== undefined) {
      this.defaultOverwriteAttributes = attrs.defaultOverwriteAttributes;
    }
    if (attrs.overwriteAttributes !== undefined) {
      this.overwriteAttributes = attrs.overwriteAttributes;
    }

    this.attributes = { ...this.defaultAttributes };
    const keys = Object.keys(this.attributes);
    let i = keys.length;
    while (i--) {
      const key = keys[i];
      if (this.overwriteAttributes !== undefined && (this.overwriteAttributes as any)[key] !== undefined) {
        (this.attributes as any)[key] = (this.overwriteAttributes as any)[key];
      } else if (this.ownAttributes !== undefined && (this.ownAttributes as any)[key] !== undefined) {
        (this.attributes as any)[key] = (this.ownAttributes as any)[key];
      } else if (this.defaultOverwriteAttributes !== undefined && (this.defaultOverwriteAttributes as any)[key] !== undefined) {
        (this.attributes as any)[key] = (this.defaultOverwriteAttributes as any)[key];
      }
    }
  }
}
