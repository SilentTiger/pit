import { ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import LayoutFrame from './LayoutFrame'
import Block from './Block'
import { IPointerInteractiveDecorator, IPointerInteractive } from '../Common/IPointerInteractive'
import { findChildrenByRange, EnumIntersectionType, findRectChildInPos, collectAttributes, hasIntersection, findChildInDocPos, compareDocPos } from '../Common/util'
import { ISearchResult } from '../Common/ISearchResult'
import FragmentParaEnd from './FragmentParaEnd'
import { IFormatAttributes } from './FormatAttributes'
import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import IRange from '../Common/IRange'
import LayoutFrameAttributes from './LayoutFrameAttributes'
import IFragmentTextAttributes from './FragmentTextAttributes'
import { IRenderStructure } from '../Common/IRenderStructure'
import { DocPos } from '../Common/DocPos'
import IRectangle from '../Common/IRectangle'
import ILayoutFrameAttributes from './LayoutFrameAttributes'

function OverrideLinkedListDecorator<T extends { new(...args: any[]): BlockCommon }>(constructor: T) {
  return class extends constructor {
    /**
     * 将一个 layoutframe 添加到当前 block
     * @param node 要添加的 layoutframe
     */
    public add(node: LayoutFrame) {
      node.setMinMetrics({ baseline: 0, bottom: 0 })
      super.add(node)
      this.setChildrenMaxWidth(node)
      node.start = this.length
      this.length += node.length
    }

    /**
     * 在目标 layoutframe 实例前插入一个 layoutframe
     * @param node 要插入的 layoutframe 实例
     * @param target 目标 layoutframe 实例
     */
    public addBefore(node: LayoutFrame, target: LayoutFrame) {
      node.setMinMetrics({ baseline: 0, bottom: 0 })
      super.addBefore(node, target)
      this.setChildrenMaxWidth(node)
      const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length
      node.setStart(start, true, true)
      this.length += node.length
    }

    /**
     * 在目标 layoutframe 实例后插入一个 layoutframe
     * @param node 要插入的 layoutframe 实例
     * @param target 目标 layoutframe 实例
     */
    public addAfter(node: LayoutFrame, target: LayoutFrame) {
      node.setMinMetrics({ baseline: 0, bottom: 0 })
      super.addAfter(node, target)
      this.setChildrenMaxWidth(node)
      node.setStart(target.start + target.length, true, true)
      this.length += node.length
    }

    /**
     * 清楚当前 block 中所有 layoutframe
     */
    public removeAll() {
      this.length = 0
      return super.removeAll()
    }

    /**
     * 从当前 block 删除一个 layoutframe
     * @param frame 要删除的 layoutframe
     */
    public remove(frame: LayoutFrame) {
      if (frame.nextSibling !== null) {
        const start = frame.prevSibling === null ? 0 : frame.prevSibling.start + frame.prevSibling.length
        frame.nextSibling.setStart(start, true, true)
      }

      super.remove(frame)
      this.length -= frame.length
    }
  }
}

@OverrideLinkedListDecorator
@ILinkedListDecorator
@IPointerInteractiveDecorator
export default class BlockCommon extends Block implements ILinkedList<LayoutFrame> {
  public static readonly blockType: string = 'blockCommon'
  public readonly canMerge: boolean = true;
  public readonly canBeMerge: boolean = true;
  public readonly needMerge: boolean = true

  public layout(): void {
    throw new Error('Method not implemented.')
  }
  public getDocumentPos(x: number, y: number, start: boolean): DocPos | null {
    x = x - this.x
    y = y - this.y
    for (let index = 0; index < this.children.length; index++) {
      const frame = this.children[index]
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.children.length - 1 && y > frame.y + frame.height)
      ) {
        const pos = frame.getDocumentPos(x - frame.x, y - frame.y, start)
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
      if (frame.start + frame.length <= offset) { continue }
      if (frame.start > offset + blockLength) { break }

      const frameOffset = offset - frame.start
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength
      const frameRects = frame.getSelectionRectangles(
        { index: Math.max(frameOffset, 0), inner: null },
        { index: Math.max(frameOffset, 0) + frameLength, inner: null }
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
  public toOp(): Op[] {
    throw new Error('Method not implemented.')
  }
  public readFromOps(Ops: Op[]): void {
    throw new Error('Method not implemented.')
  }
  public toHtml(selection?: IRange | undefined): string {
    throw new Error('Method not implemented.')
  }

  children: LayoutFrame[] = []
  head: LayoutFrame | null = null
  tail: LayoutFrame | null = null

  // #region override LinkedList method
  add(node: LayoutFrame): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAfter(node: LayoutFrame, target: LayoutFrame): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addBefore(node: LayoutFrame, target: LayoutFrame): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAtIndex(node: LayoutFrame, index: number): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAll(nodes: LayoutFrame[]): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAll(): LayoutFrame[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  remove(node: LayoutFrame): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAllFrom(node: LayoutFrame): LayoutFrame[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  splice(start: number, deleteCount: number, nodes?: LayoutFrame[] | undefined): LayoutFrame[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  findIndex(node: LayoutFrame): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
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

  /**
   * 在指定位置插入文本内容
   * @param content 要插入的文本内容
   * @param index 插入的位置
   * @param hasDiffFormat 是否已独立 fragment 插入内容
   */
  public insertText(content: string, pos: DocPos, composing: boolean, attr?: Partial<IFragmentTextAttributes>): boolean {
    let res = false
    const frame = findChildInDocPos(pos.index, this.children, true)
    if (frame) {
      res = frame.insertText(content, { index: pos.index - frame.start, inner: pos.inner }, composing, attr)
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
    if (!frame) return null
    const layoutframe = frame.insertEnter({ index: pos.index - frame.start, inner: pos.inner }, attr)
    this.needLayout = true
    if (layoutframe) {
      this.addAfter(layoutframe, frame)
    }
    this.calLength()

    return null
  }

  /**
   * 在指定位置删除指定长度的内容
   */
  public delete(start: DocPos, end: DocPos, forward: boolean) {
    if (compareDocPos(start, end) === 0) {
      const currentFrame = findChildInDocPos(start.index - this.start, this.children, true)
      if (!currentFrame) return  // 说明选区数据有问题
      start.index -= this.start
      end.index -= this.start
      if (forward) {
        if (currentFrame.start < start.index || start.inner !== null) {
          currentFrame.delete(start, end, true)
        } else if (currentFrame.prevSibling) {
          currentFrame.prevSibling.delete(start, end, true)
        } else {
          return
        }
      } else {
        currentFrame.delete(start, end, false)
      }
    } else {
      const startFrame = findChildInDocPos(start.index - this.start, this.children, true)
      const endFrame = findChildInDocPos(end.index - this.start, this.children, true)
      if (!startFrame || !endFrame) return
      start.index -= this.start
      end.index -= this.start
      if (startFrame === endFrame) {
        startFrame.delete(start, end, forward)
      } else {
        let currentFrame: LayoutFrame | null = endFrame
        while (currentFrame) {
          if (currentFrame === startFrame) {
            if (currentFrame.start === start.index && start.inner === null) {
              // 说明要直接删除第一个 frame
              this.remove(currentFrame)
            } else {
              currentFrame.delete(start, { index: currentFrame.start + currentFrame.length, inner: null }, forward)
            }
          } else if (currentFrame === endFrame) {
            if (currentFrame.start + currentFrame.length === end.index && end.inner === null) {
              // 说明要直接删除最后一个 frame
              this.remove(currentFrame)
            } else {
              currentFrame.delete({ index: currentFrame.start, inner: null }, end, forward)
            }
            break
          } else {
            // 既不是第一个 frame 也不是最后一个 frame 则直接删除这个 frame
            this.remove(currentFrame)
          }
          currentFrame = currentFrame.prevSibling
        }
      }
    }

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
  public setIndent(increase: boolean, index: number, length: number) {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].setIndent(increase)
    }
    this.needLayout = true
  }

  /**
   * 在 QuoteBlock 里面找到设计到 range 范围的 layout frame
   * @param index range 的开始位置
   * @param length range 的长度
   */
  public findLayoutFramesByRange(
    index: number, length: number,
    intersectionType = EnumIntersectionType.both,
  ): LayoutFrame[] {
    return findChildrenByRange<LayoutFrame>(this.children, index, length, intersectionType)
  }

  /**
   * 将指定范围的内容替换为指定内容
   */
  public replace(index: number, length: number, replaceWords: string): Op[] {
    const frames = this.findLayoutFramesByRange(index, length) // 替换的时候只可能找到一个 frame
    if (frames.length <= 0) { return [] }
    const oldOps = frames[0].toOp()
    frames[0].replace(index - frames[0].start, length, replaceWords)
    const newOps = frames[0].toOp()
    this.calLength()
    frames[0].setStart(frames[0].start, true, true)
    this.needLayout = true
    return (new Delta(oldOps)).diff(new Delta(newOps)).ops
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param selection 选区
   */
  public format(attr: IFormatAttributes, index: number, length: number): void {
    this.formatSelf(attr, index, length)
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst)
    if (frames.length <= 0) { return }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex]
      const offsetStart = Math.max(index - element.start, 0)
      element.format(
        attr,
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      )
    }
    this.needLayout = true
  }

  /**
   * 清除选区范围内容的格式
   * @param index 需要清除格式的选区开始位置（相对当前 block 内容的位置）
   * @param length 需要清除格式的选区长度
   */
  public clearFormat(index: number, length: number) {
    this.clearSelfFormat(index, length)
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst)
    if (frames.length <= 0) { return }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex]
      const offsetStart = Math.max(index - element.start, 0)
      element.clearFormat(
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      )
    }
    this.needLayout = true
  }

  /**
   * 判断当前 block 是否需要吃掉后面的 block 中的内容
   * 取决于当前 block 中最后一个 layoutframe 是有在结尾处有 FragmentParaEnd
   */
  public isHungry(): boolean {
    return !(this.tail!.tail instanceof FragmentParaEnd)
  }

  /**
   * 吃掉指定的 block
   * @param block 目标 block
   * @return true: 需要删除目标 block
   */
  public eat(block: Block): boolean {
    if (block === this) return false
    if (!(block instanceof BlockCommon)) return false
    if (this.tail === null) return false
    if (this.tail.tail instanceof FragmentParaEnd) return false

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
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const res: { [key: string]: Set<any> } = {}
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst)
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex]
      const offsetStart = Math.max(index - element.start, 0)
      collectAttributes(
        element.getFormat(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        ), res)
    }
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

  public setWidth(width: number) {
    if (this.width !== width) {
      this.width = width
      for (let index = 0; index < this.children.length; index++) {
        const frame = this.children[index]
        frame.setMaxWidth(width)
      }
    }
  }

  protected childrenToHtml(selection?: IRange): string {
    if (selection && selection.length > 0) {
      const endPos = selection.index + selection.length
      return this.children.map(frame => {
        if (hasIntersection(frame.start, frame.start + frame.length, selection.index, endPos)) {
          const index = Math.max(selection.index - frame.start, 0)
          const length = Math.min(endPos, frame.start + frame.length) - index
          if (index === 0 && length === frame.length) {
            return frame.toHtml()
          } else {
            return frame.toHtml({ index, length })
          }
        } else {
          return undefined
        }
      }).filter(blockHtml => { return blockHtml !== undefined }).join('')
    } else {
      return this.children.map((block) => block.toHtml()).join('')
    }
  }

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
