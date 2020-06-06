import { ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import LayoutFrame from './LayoutFrame'
import Block from './Block'
import { IPointerInteractiveDecorator, IPointerInteractive } from '../Common/IPointerInteractive'
import { findChildrenByRange, EnumIntersectionType, findRectChildInPos, collectAttributes, hasIntersection } from '../Common/util'
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
  public layout(): void {
    throw new Error('Method not implemented.')
  }
  public getDocumentPos(x: number, y: number, start: boolean): DocPos | null {
    throw new Error('Method not implemented.')
  }
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number | undefined): import('../Common/IRectangle').default[] {
    throw new Error('Method not implemented.')
  }
  public insertEnter(index: number, attr?: Partial<LayoutFrameAttributes> | undefined): Block | null {
    throw new Error('Method not implemented.')
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
  public insertText(content: string, index: number, hasDiffFormat: boolean, attr?: Partial<IFragmentTextAttributes>, composing = false) {
    const frames = this.findLayoutFramesByRange(index, 0)
    const framesLength = frames.length
    if (framesLength > 0) {
      frames[framesLength - 1].insertText(content, index - frames[framesLength - 1].start, hasDiffFormat, attr, composing)
    }
    if (this.head !== null) {
      this.head.setStart(0, true, true)
    }
    this.calLength()
    this.needLayout = true
  }

  /**
   * 在指定位置删除指定长度的内容
   * @param index 删除开始位置
   * @param length 删除内容长度
   */
  public delete(index: number, length: number): void {
    const frames = this.findLayoutFramesByRange(index, length)
    if (frames.length <= 0) { return }
    const frameMerge = frames.length > 0 &&
      frames[0].start < index &&
      index + length >= frames[0].start + frames[0].length

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex]
      if (index <= element.start && index + length >= element.start + element.length) {
        this.remove(element)
      } else {
        const offsetStart = Math.max(index - element.start, 0)
        element.delete(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        )
      }
    }

    // 尝试内部 merge frame
    if (frameMerge) {
      this.mergeFrame()
    }

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
  public eat(block: BlockCommon): boolean {
    const res = block.head === block.tail
    const targetFrame = block.head
    if (targetFrame instanceof LayoutFrame && this.tail !== null) {
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
          searchResultItem.pos += this.start + frame.start
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

  public setSize(size: { height?: number, width?: number }) {
    let heightChanged = false
    if (size.height) {
      this.height = size.height
      heightChanged = true
    }
    if (size.width) {
      this.width = size.width
      for (let index = 0; index < this.children.length; index++) {
        const frame = this.children[index]
        frame.setMaxWidth(this.width)
      }
    }
    if (this.nextSibling === null && heightChanged && this.parent !== null) {
      this.parent.setContentHeight(this.y + size.height!)
    }
  }

  /**
   * 在指定位置插入一个换行符，并将插入位置后面的内容作为 layoutframe 输出
   */
  protected splitByEnter(index: number): LayoutFrame[] {
    // block 默认的 split 行为是 根据 index 找到这个 block 内的某个 layoutframe，然后把这个 layoutframe 拆成 layoutframeA 和 layoutframeB
    // 新建一个和当前 block 类型相同的 block，把拆出来的 layoutframeB 其后的所有 layoutframe 都放到新 block 中
    // 如果这个行为不满足某些 block 子类的需求，子类需要自行 overwrite 这个方法

    const frames = this.findLayoutFramesByRange(index, 0)
    let splitFrames: LayoutFrame[] = []
    if (frames.length === 1) {
      // frames.length === 1 说明可能是要把某个 frame 切成两个，也可能是在当前 block 最前面插入换行符
      if (index === 0) {
        splitFrames = this.removeAll()
        // 这时需要在当前 block 中插入一个默认的 frame
        const newFrame = new LayoutFrame()
        newFrame.setAttributes({ ...splitFrames[0].attributes })
        const paraEnd = new FragmentParaEnd()
        paraEnd.calMetrics()
        newFrame.add(paraEnd)
        newFrame.calLength()
        this.add(newFrame)
      } else {
        // 如果逻辑进入这里，那么找到的这个 frame 一定是一个 fragmentText，拆分这个 fragmentText
        const targetFrame = frames[0]
        const newFrags = targetFrame.insertEnter(index - targetFrame.start)
        if (targetFrame.nextSibling) {
          splitFrames = this.removeAllFrom(targetFrame.nextSibling)
        }
        const newFrame = new LayoutFrame()
        newFrame.addAll(newFrags)
        newFrame.setAttributes({ ...targetFrame.attributes })
        newFrame.calLength()
        splitFrames.unshift(newFrame)
      }
    } else if (frames.length === 2) {
      // 如果长度是 2，说明正好在 两个 frame 之间插入换行
      splitFrames = this.removeAllFrom(frames[1])
    } else {
      console.error('the frames.length should not be ', frames.length)
    }

    this.calLength()

    return splitFrames
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
