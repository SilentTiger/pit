import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { ILinkedListNode } from '../Common/LinkedList'
import { increaseId } from '../Common/util'
import { IFormatAttributes } from './FormatAttributes'
import IFragmentAttributes, { FragmentDefaultAttributes } from './FragmentAttributes'
import LayoutFrame from './LayoutFrame'
import { IBubbleUpable } from '../Common/IBubbleElement'
import { DocPos } from '../Common/DocPos'
import IFragmentTextAttributes from './FragmentTextAttributes'
import IRangeNew from '../Common/IRangeNew'
import { IAttributable, IAttributableDecorator, IAttributes } from '../Common/IAttributable'

@IAttributableDecorator
export default class Fragment implements ILinkedListNode, IBubbleUpable, IAttributable {
  public static readonly fragType: string = 'frag'
  public defaultAttributes: IFragmentAttributes = FragmentDefaultAttributes
  public overrideDefaultAttributes: Partial<IFragmentAttributes> | null = null
  public originalAttributes: Partial<IFragmentAttributes> | null = null
  public overrideAttributes: Partial<IFragmentAttributes> | null = null
  public attributes: IFragmentAttributes = FragmentDefaultAttributes

  get start(): number {
    return this.prevSibling === null ? 0 : this.prevSibling.start + this.prevSibling.length
  }

  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: LayoutFrame | null = null
  public metrics: IFragmentMetrics = { baseline: 0, bottom: 0, xTop: 0 }
  public readonly id: number = increaseId()
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get length(): number {
    return 1
  }

  private isPointerHover = false

  public destroy() {
    // todo
  }

  public readFromOps(Op: Op): void {
    /** */
  }
  /**
   * 计算当前 fragment 的宽度和高度
   */
  public calTotalWidth() {
    return 0
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics(): void {
    /** */
  }

  public toOp(withKey: boolean): Op {
    return { retain: 0 }
  }

  public toHtml(selection?: IRangeNew): string {
    return ''
  }

  public toText(selection?: IRangeNew): string {
    return ''
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param range 选区
   */
  public format(attr: IFormatAttributes, range?: IRangeNew) {
    if (!range) {
      this.setAttributes(attr)
    }
  }

  public clearFormat(range?: IRangeNew) {
    if (!range) {
      this.setAttributes(this.defaultAttributes)
    }
  }

  public getFormat() {
    return this.attributes
  }

  public insertText(content: string, pos: DocPos, attr?: Partial<IFragmentTextAttributes>): boolean {
    /** empty function */
    return false
  }

  public insertEnter(pos: DocPos): Fragment | null {
    return null
  }

  /**
   * 删除指定范围的内容（length 为空时删除 index 后所有内容）
   */
  public delete(range: IRangeNew, forward?: boolean): void {
    /** empty function */
  }

  /**
   *  合并两个 fragment
   */
  public eat(frag: Fragment): boolean {
    return false
  }

  public onPointerEnter() {
    this.isPointerHover = true
  }
  public onPointerLeave() {
    this.isPointerHover = false
  }
  public onPointerMove(): void {
    /** */
  }
  public onPointerDown(): void {
    /** */
  }
  public onPointerUp(): void {
    /** */
  }
  public onPointerTap() {
    /** */
  }

  public bubbleUp(type: string, data: any): void {
    if (this.parent) {
      this.parent.bubbleUp(type, data, [this])
    }
  }

  // #region override IAttributableDecorator method
  public setOverrideDefaultAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  public setOverrideAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  public setAttributes(attr: IAttributes | null | undefined): void {
    throw new Error('Method not implemented.')
  }
  public compileAttributes(): void {
    throw new Error('Method not implemented.')
  }
  // #endregion
}
