import type { ILinkedList } from '../Common/LinkedList'
import { ILinkedListDecorator } from '../Common/LinkedList'
import LayoutFrame from '../RenderStructure/LayoutFrame'
import Block from './Block'
import type { IPointerInteractive } from '../Common/IPointerInteractive'
import { IPointerInteractiveDecorator } from '../Common/IPointerInteractive'
import {
  findChildrenByRange,
  EnumIntersectionType,
  findRectChildInPos,
  findChildInDocPos,
  getFormat,
  collectAttributes,
  format,
  clearFormat,
  deleteRange,
  toText,
  findChildIndexInDocPos,
} from '../Common/util'
import type { ISearchResult } from '../Common/ISearchResult'
import FragmentParaEnd from '../Fragment/FragmentParaEnd'
import type Op from 'quill-delta-enhanced/dist/Op'
import type IRange from '../Common/IRange'
import type IFragmentTextAttributes from '../Fragment/FragmentTextAttributes'
import type { IRenderStructure } from '../Common/IRenderStructure'
import type { DocPos } from '../Common/DocPos'
import { cloneDocPos, getRelativeDocPos } from '../Common/DocPos'
import type IRectangle from '../Common/IRectangle'
import type ILayoutFrameAttributes from '../RenderStructure/LayoutFrameAttributes'
import type { IAttributable, IAttributes } from '../Common/IAttributable'
import { IAttributableDecorator } from '../Common/IAttributable'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import type { IDocPosOperator } from '../Common/IDocPosOperator'
import { IDosPosOperatorHDecorator, IDosPosOperatorVDecorator } from '../Common/IDocPosOperator'
import { IBubbleUpableDecorator } from '../Common/IBubbleUpable'
import type Fragment from '../Fragment/Fragment'
import type { ISelectedElementGettable } from '../Common/ISelectedElementGettable'
import { ISelectedElementGettableDecorator } from '../Common/ISelectedElementGettable'

function OverrideLinkedListDecorator<T extends new (...args: any[]) => BlockCommon>(constructor: T) {
  return class extends constructor {
    /**
     * 清楚当前 block 中所有 layoutframe
     */
    public override removeAll() {
      this.length = 0
      return super.removeAll()
    }

    /**
     * 从当前 block 删除一个 layoutframe
     * @param frame 要删除的 layoutframe
     */
    public override remove(frame: LayoutFrame) {
      if (frame.nextSibling !== null) {
        const start = frame.prevSibling === null ? 0 : frame.prevSibling.start + frame.prevSibling.length
        frame.nextSibling.setStart(start, true, true)
      }

      super.remove(frame)
      this.length -= frame.length
    }

    public override removeAllFrom(frame: LayoutFrame) {
      const removedFrames = super.removeAllFrom(frame)
      const removedLength = removedFrames.reduce((sum, frame) => sum + frame.length, 0)
      this.length -= removedLength
      return removedFrames
    }

    public override splice(start: number, deleteCount: number, nodes?: LayoutFrame[]) {
      // const addLength = nodes ? nodes.reduce((sum, frame) => sum + frame.length, 0) : 0
      const removedFrames = super.splice(start, deleteCount, nodes)
      // const removedLength = removedFrames.reduce((sum, frame) => sum + frame.length, 0)
      // this.length = this.length + addLength - removedLength
      return removedFrames
    }
  }
}

@ISelectedElementGettableDecorator
@IBubbleUpableDecorator
@OverrideLinkedListDecorator
@ILinkedListDecorator
@IPointerInteractiveDecorator
@IAttributableDecorator
@IDosPosOperatorHDecorator
@IDosPosOperatorVDecorator
export default class BlockCommon
  extends Block
  implements ILinkedList<LayoutFrame>, IAttributable, IDocPosOperator, ISelectedElementGettable
{
  public static override readonly blockType: string = 'blockCommon'
  public children: LayoutFrame[] = []
  public head: LayoutFrame | null = null
  public tail: LayoutFrame | null = null
  public defaultAttributes: IAttributes = {}
  public overrideDefaultAttributes: IAttributes | null = null
  public originalAttributes: IAttributes | null = null
  public overrideAttributes: IAttributes | null = null
  public attributes: IAttributes = {}

  public readonly canMerge: boolean = true
  public readonly canBeMerge: boolean = true
  public override readonly needMerge: boolean = true

  public layout(): void {
    throw new Error('Method not implemented.')
  }
  public getDocumentPos(x: number, y: number, start: boolean): DocPos | null {
    const targetX = x - this.x
    const targetY = y - this.y
    for (let index = 0; index < this.children.length; index++) {
      const frame = this.children[index]
      if (
        (frame.y <= targetY && targetY <= frame.y + frame.height) ||
        (index === 0 && targetY < frame.y) ||
        (index === this.children.length - 1 && targetY > frame.y + frame.height)
      ) {
        const pos = frame.getDocumentPos(targetX - frame.x, targetY - frame.y, start)
        if (pos) {
          pos.index += frame.start
        }
        return pos
      }
    }
    return null
  }
  /**
   * 获取指定范围的矩形区域
   */
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    const rects: IRectangle[] = []
    let offset = start.index
    const length = end.index - offset
    const blockLength = offset < 0 ? length + offset : length
    offset = Math.max(0, offset)
    for (let frameIndex = 0; frameIndex < this.children.length; frameIndex++) {
      const frame = this.children[frameIndex]
      if (frame.start + frame.length <= offset) {
        continue
      }
      if (frame.start > offset + blockLength) {
        break
      }

      const frameOffset = offset - frame.start
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength
      const frameRects = frame.getSelectionRectangles(
        { index: Math.max(frameOffset, 0), inner: null },
        { index: Math.max(frameOffset, 0) + frameLength, inner: null },
      )
      for (let rectIndex = frameRects.length - 1; rectIndex >= 0; rectIndex--) {
        const rect = frameRects[rectIndex]
        rect.y += this.y
        // 如果 correctByPosY 不在当前 rect 的纵向范围内，就过滤这条结果
        if (typeof correctByPosY === 'number' && (correctByPosY < rect.y || correctByPosY > rect.y + rect.height)) {
          frameRects.splice(rectIndex, 1)
          continue
        }
        rect.x += this.x
      }
      rects.push(...frameRects)
    }

    return rects
  }
  public toOp(withKey: boolean): Op[] {
    return []
  }
  public readFromOps(Ops: Op[]): void {
    throw new Error('Method not implemented.')
  }
  public toHtml(range?: IRange): string {
    throw new Error('Method not implemented.')
  }

  public toText(range?: IRange): string {
    return toText(this, range)
  }

  /**
   * 在指定位置插入文本内容
   * @param content 要插入的文本内容
   * @param index 插入的位置
   * @param hasDiffFormat 是否已独立 fragment 插入内容
   */
  public insertText(content: string, pos: DocPos, attr?: Partial<IFragmentTextAttributes>): boolean {
    const targetPos = cloneDocPos(pos)
    let res = false
    const frame = findChildInDocPos(targetPos.index, this.children, true)
    if (frame) {
      res = frame.insertText(content, { index: targetPos.index - frame.start, inner: targetPos.inner }, attr)
    }
    if (this.head !== null) {
      this.head.setStart(0, true, true)
    }
    this.calLength()
    this.needLayout = true
    return res
  }

  public insertEnter(pos: DocPos, attr?: Partial<ILayoutFrameAttributes>): BlockCommon | null {
    const frame = findChildInDocPos(pos.index, this.children, true)
    if (!frame) {
      return null
    }
    const layoutframe = frame.insertEnter({ index: pos.index - frame.start, inner: pos.inner }, attr)
    this.needLayout = true
    if (layoutframe) {
      this.addAfter(layoutframe, frame)
    }
    this.calLength()

    return null
  }

  public insertBlock(block: Block, pos: DocPos): Block[] {
    // 大概分为两种情况
    // 1、插在两个 layout frame 之间
    // 2、插入某个 layout frame
    const targetFrameIndex = findChildIndexInDocPos(pos.index, this.children, true)
    const targetFrame = this.children[targetFrameIndex]
    if (targetFrameIndex < 0) {
      return []
    }
    if (targetFrame.start === pos.index && pos.inner === null) {
      // 把插入位置前后的 layout frame 分别分配到两个 block 中
      const removedFrames = this.removeAllFrom(targetFrame)
      const newBlockCommon = this.createSelf()
      newBlockCommon.addAll(removedFrames)
      newBlockCommon.setAttributes(this.originalAttributes)
      return [this, block, newBlockCommon]
    } else {
      // 如果是插入某个 frame，要看插入这个 frame 能不能正常插入 block，如果不行就要先把这个 frame 拆成两个 frame
      // 然后把 block 插入这两个 frame 之间
      const res = targetFrame.tryInsertBlock(block, getRelativeDocPos(this.start, pos))
      if (!res) {
        // 说明此处无法正常插入 block，需要先切分 frame，然后再插入
        const frame = targetFrame.insertEnter(pos)
        if (frame) {
          const newBlockCommon = this.createSelf()
          newBlockCommon.addAll([frame])
          newBlockCommon.setAttributes(this.originalAttributes)
          this.calLength()
          this.needLayout = true
          return [this, block, newBlockCommon]
        }
      }
      return []
    }
  }

  public insertFragment(frag: Fragment, pos: DocPos) {
    const frame = findChildInDocPos(pos.index, this.children, true)
    if (!frame) {
      return
    }
    frame.insertFragment(frag, getRelativeDocPos(frame.start, pos))
    this.needLayout = true
    this.calLength()
  }

  /**
   * 在指定位置删除指定长度的内容
   */
  public delete(range: IRange, forward: boolean) {
    deleteRange(this, range, forward)

    this.mergeFrame()

    if (this.head !== null) {
      this.head.setStart(0, true, true)
    }

    this.calLength()
    this.needLayout = true
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean) {
    let hasChange = false
    for (let i = 0; i < this.children.length; i++) {
      hasChange = this.children[i].setIndent(increase) || hasChange
    }
    if (hasChange) {
      this.needLayout = true
      this.bubbleUp(BubbleMessage.CONTENT_CHANGE, null, [this])
    }
  }

  /**
   * 在 QuoteBlock 里面找到设计到 range 范围的 layout frame
   * @param index range 的开始位置
   * @param length range 的长度
   */
  public findLayoutFramesByRange(
    index: number,
    length: number,
    intersectionType?: EnumIntersectionType,
  ): LayoutFrame[] {
    const type = intersectionType ?? EnumIntersectionType.both
    return findChildrenByRange<LayoutFrame>(this.children, index, length, intersectionType)
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param selection 选区
   */
  public format(attr: any, range?: IRange): void {
    this.formatSelf(attr, range)

    format(this, attr, range)

    this.needLayout = true
  }

  /**
   * 清除选区范围内容的格式
   * @param index 需要清除格式的选区开始位置（相对当前 block 内容的位置）
   * @param length 需要清除格式的选区长度
   */
  public clearFormat(range?: IRange) {
    this.clearSelfFormat(range)

    clearFormat(this, range)

    this.needLayout = true
  }

  /**
   * 判断当前 block 是否需要吃掉后面的 block 中的内容
   * 取决于当前 block 中最后一个 layoutframe 是有在结尾处有 FragmentParaEnd
   */
  public override isHungry(): boolean {
    return !(this.tail!.tail instanceof FragmentParaEnd)
  }

  /**
   * 吃掉指定的 block
   * @param block 目标 block
   * @return true: 需要删除目标 block
   */
  public override eat(block: Block): boolean {
    if (block === this) {
      return false
    }
    if (!(block instanceof BlockCommon)) {
      return false
    }
    if (this.tail === null) {
      return false
    }
    if (this.tail.tail instanceof FragmentParaEnd) {
      return false
    }

    const res = block.head === block.tail
    const targetFrame = block.head
    if (targetFrame instanceof LayoutFrame) {
      // 先从 block 中把 targetFrame 删除
      block.remove(targetFrame)
      // 再把 targetFrame 的内容添加到 当前 block 中
      this.tail.addAll(targetFrame.children)
      this.tail.calLength()
      this.mergeFrame()
      this.calLength()
      this.needLayout = true
    }
    return res
  }

  /**
   * 获取某个范围内的内容格式
   */
  public getFormat(range?: IRange): { [key: string]: Set<any> } {
    const res = range ? getFormat(this, [range]) : getFormat(this)
    collectAttributes(this.attributes, res)
    return res
  }

  public getAllLayoutFrames() {
    return this.children
  }

  /**
   * 搜索
   */
  public search(keywords: string): ISearchResult[] {
    const res: ISearchResult[] = []
    for (let index = 0; index < this.children.length; index++) {
      const frame = this.children[index]
      const searchResult = frame.search(keywords)
      if (searchResult.length > 0) {
        for (let i = 0; i < searchResult.length; i++) {
          const searchResultItem = searchResult[i]
          searchResultItem.pos.index += this.start + frame.start
          for (let j = 0; j < searchResultItem.rects.length; j++) {
            const rect = searchResultItem.rects[j]
            rect.x += this.x
            rect.y += this.y
          }
        }
        res.push(...searchResult)
      }
    }
    return res
  }

  public getChildrenStackByPos(x: number, y: number): Array<IRenderStructure> {
    const child = findRectChildInPos(x, y, this.children)
    let res
    if (child) {
      res = child.getChildrenStackByPos(x - child.x, y - child.y)
      res.unshift(this)
    } else {
      res = [this]
    }
    return res
  }

  /**
   * 计算当前 block 的长度
   */
  public calLength() {
    this.length = 0
    for (let index = 0; index < this.children.length; index++) {
      this.length += this.children[index].length
    }
  }

  public merge(target: BlockCommon): void {
    const targetFrames = target.removeAll()
    this.addAll(targetFrames)
  }

  public override setWidth(width: number) {
    if (this.width !== width) {
      this.width = width
      for (let index = 0; index < this.children.length; index++) {
        const frame = this.children[index]
        frame.setMaxWidth(width)
      }
    }
  }

  public createSelf(): BlockCommon {
    throw new Error('method not implemented')
  }

  // #region IBubbleUpable methods
  public bubbleUp(type: string, data: any, stack?: any[]): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  public setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  // #endregion

  // #region IDocPosOperator methods
  public firstPos(): DocPos {
    throw new Error('this method should implemented in IDosPosOperatorHDecorator')
  }
  public lastPos(): DocPos {
    throw new Error('this method should implemented in IDosPosOperatorHDecorator')
  }
  public nextPos(pos: DocPos): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorHDecorator')
  }
  public prevPos(pos: DocPos): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorHDecorator')
  }
  public firstLinePos(x: number): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorHDecorator')
  }
  public lastLinePos(x: number): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorHDecorator')
  }
  public nextLinePos(pos: DocPos, x: number): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorVDecorator')
  }
  public prevLinePos(pos: DocPos, x: number): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorVDecorator')
  }
  public lineStartPos(pos: DocPos, y: number): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorVDecorator')
  }
  public lineEndPos(pos: DocPos, y: number): DocPos | null {
    throw new Error('this method should implemented in IDosPosOperatorVDecorator')
  }
  // #endregion

  // #region override LinkedList method
  public beforeAdd(nodes: LayoutFrame[]) {
    nodes.forEach((node) => {
      node.setMinMetrics({ baseline: 0, bottom: 0 })
    })
  }
  public afterAdd(
    nodes: LayoutFrame[],
    index: number,
    prevNode: LayoutFrame | null,
    nextNode: LayoutFrame | null,
    array: LayoutFrame[],
  ) {
    nodes.forEach((node) => {
      this.setChildrenMaxWidth(node)
      this.length += node.length
      node.setBubbleHandler(this.bubbleUp.bind(this))
    })
    nodes[0].setStart(index === 0 ? 0 : array[index - 1].start + array[index - 1].length, true, true)
  }
  public afterRemove(
    nodes: LayoutFrame[],
    index: number,
    prevNode: LayoutFrame | null,
    nextNode: LayoutFrame | null,
    array: LayoutFrame[],
  ) {
    nodes.forEach((node) => {
      node.setBubbleHandler(null)
    })
  }
  public addLast(node: LayoutFrame): void {
    throw new Error('Method not implemented.')
  }
  public addAfter(node: LayoutFrame, target: LayoutFrame): void {
    throw new Error('Method not implemented.')
  }
  public addBefore(node: LayoutFrame, target: LayoutFrame): void {
    throw new Error('Method not implemented.')
  }
  public addAtIndex(node: LayoutFrame, index: number): void {
    throw new Error('Method not implemented.')
  }
  public addAll(nodes: LayoutFrame[]): void {
    throw new Error('Method not implemented.')
  }
  public removeAll(): LayoutFrame[] {
    throw new Error('Method not implemented.')
  }
  public remove(node: LayoutFrame): void {
    throw new Error('Method not implemented.')
  }
  public removeAllFrom(node: LayoutFrame): LayoutFrame[] {
    throw new Error('Method not implemented.')
  }
  public splice(start: number, deleteCount: number, nodes?: LayoutFrame[]): LayoutFrame[] {
    throw new Error('Method not implemented.')
  }
  public findIndex(node: LayoutFrame): void {
    throw new Error('Method not implemented.')
  }
  // #endregion

  // #region override IPointerInteractiveDecorator method
  public onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerLeave(): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerDown(x: number, y: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerUp(x: number, y: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerTap(x: number, y: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
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

  // #region getSelectedElement methods
  public getSelectedElement(range: IRange): any[][] {
    throw new Error('Method not implemented.')
  }
  // #endregion

  /**
   * 设置 layoutframe 的位置索引
   */
  protected setFrameStart() {
    if (this.children.length > 0) {
      this.children[0].start = 0
    } else {
      return
    }
    for (let index = 1; index < this.children.length; index++) {
      this.children[index].start = this.children[index - 1].start + this.children[index - 1].length
    }
  }

  protected setChildrenMaxWidth(frame: LayoutFrame) {
    frame.setMaxWidth(this.width)
  }

  /**
   * 合并没有结尾的 layoutframe
   */
  private mergeFrame() {
    for (let frameIndex = 0; frameIndex < this.children.length - 1; frameIndex++) {
      const frame = this.children[frameIndex]
      if (!(frame.tail instanceof FragmentParaEnd)) {
        // 如果某个 frame 没有段落结尾且这个 frame 不是最后一个 frame 就 merge
        const target = this.children[frameIndex + 1]
        frame.eat(target)
        this.remove(target)
        break
      }
    }
  }
}
