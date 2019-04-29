import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
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

  public prevSibling: this | null = null;
  public nextSibling: this | null = null;
  public parent: LayoutFrame | null = null;
  public delta: Delta;
  public abstract attributes: IFragmentAttributes;
  public abstract metrics: IFragmentMetrics;
  public readonly id: string = guid();
  public abstract readonly length: number;

  constructor(op: Op) {
    this.delta = new Delta([op]);
  }

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

  public delete(index: number, length: number): void {}

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
