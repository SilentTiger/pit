import type Op from 'quill-delta-enhanced/dist/Op'
import type { IFragmentMetrics } from '../Common/IFragmentMetrics'
import type { ILinkedListNode } from '../Common/LinkedList'
import { increaseId } from '../Common/util'
import type { IFormatAttributes } from './FormatAttributes'
import type IFragmentAttributes from './FragmentAttributes'
import { FragmentDefaultAttributes } from './FragmentAttributes'
import type LayoutFrame from './LayoutFrame'
import type { IBubbleUpable } from '../Common/IBubbleUpable'
import { IBubbleUpableDecorator } from '../Common/IBubbleUpable'
import type { DocPos } from '../Common/DocPos'
import { moveRight } from '../Common/DocPos'
import type IFragmentTextAttributes from './FragmentTextAttributes'
import type IRange from '../Common/IRange'
import type { IAttributable, IAttributes } from '../Common/IAttributable'
import { IAttributableDecorator } from '../Common/IAttributable'
import type { IDocPosOperator } from '../Common/IDocPosOperator'

@IBubbleUpableDecorator
@IAttributableDecorator
export default class Fragment implements ILinkedListNode, IBubbleUpable, IAttributable, IDocPosOperator {
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
  public isPointerHover = false

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

  public toHtml(selection?: IRange): string {
    return ''
  }

  public toText(selection?: IRange): string {
    return ''
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param range 选区
   */
  public format(attr: IFormatAttributes, range?: IRange) {
    if (!range) {
      this.setAttributes(attr)
    }
  }

  public clearFormat(range?: IRange) {
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
  public delete(range: IRange, forward?: boolean): void {
    /** empty function */
  }

  /**
   *  合并两个 fragment
   */
  public eat(frag: Fragment): boolean {
    return false
  }

  public firstPos(): DocPos {
    return { index: 0, inner: null }
  }
  public lastPos(): DocPos {
    return { index: this.length - 1, inner: null }
  }
  public nextPos(pos: DocPos): DocPos | null {
    const newPos = moveRight(pos, 1)
    return newPos.index >= this.length ? null : newPos
  }
  public prevPos(pos: DocPos): DocPos | null {
    const newPos = moveRight(pos, -1)
    return newPos.index < 0 ? null : newPos
  }
  public firstLinePos(x: number): DocPos | null {
    return null
  }
  public lastLinePos(x: number): DocPos | null {
    return null
  }
  public nextLinePos(pos: DocPos): DocPos | null {
    return null
  }
  public prevLinePos(pos: DocPos): DocPos | null {
    return null
  }
  public lineStartPos(pos: DocPos): DocPos | null {
    return null
  }
  public lineEndPos(pos: DocPos): DocPos | null {
    return null
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

  // #region IBubbleUpable methods
  public bubbleUp(type: string, data: any, stack?: any[]): void {
    throw new Error('this method should implemented in IGetAbsolutePosDecorator')
  }
  public setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  // #endregion

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
