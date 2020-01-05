import Op from 'quill-delta/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import IRange from '../Common/IRange'
import { ILinkedListNode } from '../Common/LinkedList'
import { increaseId } from '../Common/util'
import { IFormatAttributes } from './FormatAttributes'
import IFragmentAttributes from './FragmentAttributes'
import LayoutFrame from './LayoutFrame'
import { IBubbleUpable } from '../Common/IBubbleElement'

export default abstract class Fragment implements ILinkedListNode, IBubbleUpable {
  public static readonly fragType: string = 'frag'
  get start(): number {
    return this.prevSibling === null
      ? 0
      : this.prevSibling.start + this.prevSibling.length
  }

  public prevSibling: this | null = null;
  public nextSibling: this | null = null;
  public parent: LayoutFrame | null = null;
  public abstract attributes: IFragmentAttributes;
  public abstract metrics: IFragmentMetrics;
  public readonly id: number = increaseId();
  public abstract readonly length: number;

  protected abstract originAttrs: Partial<IFragmentAttributes>;
  protected abstract readonly defaultAttrs: IFragmentAttributes;

  private isPointerHover: boolean = false;

  public destroy() {
    // todo
  }

  public abstract readFromOps(Op: Op): void;
  /**
   * 计算当前 fragment 的宽度和高度
   */
  public abstract calSize(): { height: number; width: number };
  /**
   * 计算当前 fragment 的 metrics
   */
  public abstract calMetrics(): void;

  public abstract toOp(): Op;

  public abstract toHtml(selection?: IRange): string;

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param range 选区
   */
  public format(attr: IFormatAttributes, range?: IRange) {
    if (!range && this.length === 1) {
      this.setAttributes(attr)
    } else {
      throw new Error(`${typeof this} format error, range:${JSON.stringify(range)}`)
    }
  }

  public getFormat() {
    return this.attributes
  }

  public insert(content: string, index: number) { /** empty function */ }

  /**
   * 删除指定范围的内容（length 为空时删除 index 后所有内容）
   */
  public delete(index: number, length?: number): void { /** empty function */ }

  public setAttributes(attrs: any) {
    this.setOriginAttrs(attrs)
    this.compileAttributes()
  }

  public setOriginAttrs(attrs: any) {
    const keys = Object.keys(this.defaultAttrs)
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      if (this.defaultAttrs.hasOwnProperty(key) && attrs.hasOwnProperty(key)) {
        if (attrs[key] !== this.defaultAttrs[key]) {
          this.originAttrs[key] = attrs[key]
        } else {
          delete this.originAttrs[key]
        }
      }
    }
  }

  public onPointerEnter() {
    this.isPointerHover = true
  }
  public onPointerLeave() {
    this.isPointerHover = false
  }
  public onPointerMove(): void { /** */ }
  public onPointerDown(): void { /** */ }
  public onPointerUp(): void { /** */ }
  public onPointerTap() { /** */ }

  public bubbleUp(type: string, data: any): void {
    if (this.parent) {
      this.parent.bubbleUp(type, data, [this])
    }
  }

  /**
   * 编译计算渲染所用的属性
   */
  protected compileAttributes() {
    this.attributes = { ...this.defaultAttrs, ...this.originAttrs }
  }
}
