import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import { ILinkedListNode } from '../Common/LinkedList';
import { guid } from '../Common/util';
import FragmentAttributes from './FragmentAttributes';
import LayoutFrame from './LayoutFrame';

export default abstract class Fragment implements ILinkedListNode {

  public prevSibling: Fragment = null;
  public nextSibling: Fragment = null;
  public parent: LayoutFrame;
  public attributes: FragmentAttributes;
  public metrics: IFragmentMetrics;
  public readonly id: string = guid();
  public readonly length: number;

  public destroy() {}

  get start(): number {
    return this.prevSibling === null ? 0 : this.prevSibling.start + this.prevSibling.length;
  }

  /**
   * 计算当前 fragment 的宽度和高度
   */
  public abstract calSize(): {height: number, width: number};
  /**
   * 计算当前 fragment 的 metrics
   */
  public abstract calMetrics(): void;
  /**
   * 设置当前 fragment 的各种属性
   * @param attr 属性 map
   */
  public setAttributes(attr: any) {
    const keys = Object.keys(this.attributes);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if ((attr as any)[key] !== undefined) {
        (this.attributes as any)[key] = (attr as any)[key];
      }
    }
  }

}
