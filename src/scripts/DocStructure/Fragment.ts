import Delta from 'quill-delta';
import IExportable from '../Common/IExportable';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import { ILinkedListNode } from '../Common/LinkedList';
import { guid } from '../Common/util';
import IFragmentAttributes from './FragmentAttributes';
import LayoutFrame from './LayoutFrame';

export default abstract class Fragment implements ILinkedListNode, IExportable {
  get start(): number {
    return this.prevSibling === null
      ? 0
      : this.prevSibling.start + this.prevSibling.length;
  }

  public prevSibling: Fragment | null = null;
  public nextSibling: Fragment | null = null;
  public parent: LayoutFrame | null = null;
  public abstract attributes: IFragmentAttributes;
  public abstract metrics: IFragmentMetrics;
  public readonly id: string = guid();
  public abstract readonly length: number;

  public destroy() {
    // todo
  }

  /**
   * 计算当前 fragment 的宽度和高度
   */
  public abstract calSize(): { height: number; width: number };
  /**
   * 计算当前 fragment 的 metrics
   */
  public abstract calMetrics(): void;

  public abstract toDelta(): Delta;

  public abstract toHtml(): string;

  public setAttributes(attrs: any) {
    const keys = Object.keys(this.attributes);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if (attrs[key] !== undefined) {
        (this.attributes as any)[key] = attrs[key];
      }
    }
  }
}
