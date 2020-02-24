import * as EventEmitter from 'eventemitter3'
import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import { EventName } from '../Common/EnumEventName'
import ICanvasContext from '../Common/ICanvasContext'
import IRange from '../Common/IRange'
import IRectangle from '../Common/IRectangle'
import { ISearchResult } from '../Common/ISearchResult'
import { ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import { requestIdleCallback } from '../Common/Platform'
import { collectAttributes, EnumIntersectionType, findChildrenByRange, hasIntersection, increaseId, splitIntoBat, isPointInRectangle, findRectChildInPos, findRectChildInPosY } from '../Common/util'
import editorConfig from '../IEditorConfig'
import Block from './Block'
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import ListItem from './ListItem'
import ILayoutFrameAttributes from './LayoutFrameAttributes'
import { IRenderStructure } from '../Common/IRenderStructure'
import { EnumCursorType } from '../Common/EnumCursorType'
import { IBubbleUpable } from '../Common/IBubbleElement'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import StructureRegistrar from '../StructureRegistrar'
import { IPointerInteractive, IPointerInteractiveDecorator } from '../Common/IPointerInteractive'

function OverrideLinkedListDecorator<T extends { new(...args: any[]): DocContent }>(constructor: T) {
  return class extends constructor {
    /**
     * 将一个 block 添加到当前 block
     * @param node 要添加的 block
     */
    public add(node: Block) {
      super.add(node)
      node.setSize({ width: editorConfig.canvasWidth })
      node.start = this.length
      this.length += node.length
    }

    /**
     * 在目标 block 实例前插入一个 block
     * @param node 要插入的 block 实例
     * @param target 目标 block 实例
     */
    public addBefore(node: Block, target: Block) {
      super.addBefore(node, target)
      node.setSize({ width: editorConfig.canvasWidth })
      const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length
      node.setStart(start, true, true)
      this.length += node.length
      if (node instanceof ListItem) {
        this.markListItemToLayout((new Set<number>()).add(node.attributes.listId))
      }
    }

    /**
     * 在目标 block 实例后插入一个 block
     * @param node 要插入的 block 实例
     * @param target 目标 block 实例
     */
    public addAfter(node: Block, target: Block) {
      super.addAfter(node, target)
      node.setSize({ width: editorConfig.canvasWidth })
      node.setStart(target.start + target.length, true, true)
      if (node instanceof ListItem) {
        this.markListItemToLayout((new Set<number>()).add(node.attributes.listId))
      }
    }

    /**
     * 清楚当前 doc 中所有 block
     */
    public removeAll() {
      this.length = 0
      return super.removeAll()
    }

    /**
     * 从当前 doc 删除一个 block
     * @param node 要删除的 block
     */
    public remove(node: Block) {
      if (node.nextSibling !== null) {
        const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length
        node.nextSibling.setStart(start, true, true)
      }

      super.remove(node)
      this.length -= node.length
      if (node instanceof ListItem) {
        this.markListItemToLayout((new Set<number>()).add(node.attributes.listId))
      }
    }

    public splice(start: number, deleteCount: number, nodes: Block[] = []): Block[] {
      const actuallyInsertIndex = Math.min(start, this.children.length - 1)
      const removedBlocks = super.splice(start, deleteCount, nodes)
      const elementStart = actuallyInsertIndex > 0 ? this.children[actuallyInsertIndex - 1].start + this.children[actuallyInsertIndex - 1].length : 0
      if (nodes.length > 0) {
        nodes[0].setStart(elementStart, true, true, true)
      }
      return removedBlocks
    }
  }
}

@OverrideLinkedListDecorator
@ILinkedListDecorator
@IPointerInteractiveDecorator
export default class DocContent implements ILinkedList<Block>, IRenderStructure, IBubbleUpable {
  head: Block | null = null
  tail: Block | null = null
  // #region override LinkedList method
  add(node: Block): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAfter(node: Block, target: Block): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addBefore(node: Block, target: Block): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAtIndex(node: Block, index: number): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAll(nodes: Block[]): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAll(): Block[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  remove(node: Block): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAllFrom(node: Block): Block[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  splice(start: number, deleteCount: number, nodes?: Block[] | undefined): Block[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  findIndex(node: Block): number {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return -1
  }
  // #endregion

  public get selection(): IRange | null {
    return this._selection
  }
  public em: EventEmitter = new EventEmitter();
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public length: number = 0;
  public readonly children: Block[] = [];
  public selectionRectangles: IRectangle[] = [];
  // 选区变更时同时修改这个值和 nextFormat
  public currentFormat: { [key: string]: Set<any> } | null = null;
  // 选区长度为 0 时用工具栏改格式只改这个值，选区长度大于 0 时用工具栏改格式同时修改这个值和 currentFormat
  public nextFormat: { [key: string]: Set<any> } | null = null;

  private firstScreenRender = 0;
  private initLayout = false;
  private idleLayoutStartBlock: Block | null = null;
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private _selection: IRange | null = null;

  private needRecalculateSelectionRect: boolean = false;

  private searchKeywords: string = '';
  private searchResults: ISearchResult[] = [];
  private searchResultCurrentIndex: number | undefined = undefined;

  public readFromChanges(delta: Delta) {
    this.firstScreenRender = 0
    this.clear()
    const blocks = this.readDeltaToBlocks(delta)
    this.addAll(blocks)

    if (this.head !== null) {
      this.head.setStart(0, true, true)
    }
  }

  public applyChanges(delta: Delta) {
    // delta 中的 op 可以分为两种情况，一种是会修改数据的，如果 insert delete 和带 attributes 的 retain
    // 另一种是不会修改数据的，就是不带 attributes 的 retain
    // 对于连续的会修改数据的 op 一次性处理
    const currentIndex = 0
    const batOps: Array<{ start: number, end: number, ops: Op[] }> = []
    let currentBat: { start: number, end: number, ops: Op[] } | undefined
    for (let index = 0; index < delta.ops.length; index++) {
      if (currentBat === undefined) {
        currentBat = {
          start: currentIndex,
          end: 0,
          ops: [],
        }
      }
      const op = delta.ops[index]
      if (op.delete !== undefined) {
        currentBat.ops.push(op)
        currentBat.end += op.delete
      } else if (op.insert !== undefined) {
        currentBat.ops.push(op)
      } else if (typeof op.retain === 'number') {
        if (op.attributes !== undefined) {
          currentBat.ops.push(op)
          currentBat.end += op.retain
        } else {
          // 说明这是一个移动光标的操作，这一批已经结束了
          batOps.push(currentBat)
          currentBat = undefined
        }
      } else if (op.retain instanceof Delta) {
        if (op.attributes !== undefined) {
          currentBat.ops.push(op)
          currentBat.end += 1
        } else {
          // 说明这是一个针对某个 block 的操作，这时候把这种操作单独作为一个 bat
          batOps.push(currentBat)
          batOps.push({
            start: currentIndex,
            end: currentIndex + 1,
            ops: [op],
          })
          currentBat = undefined
        }
      }
    }
    if (currentBat !== undefined) {
      batOps.push(currentBat)
    }
    for (let batIndex = 0; batIndex < batOps.length; batIndex++) {
      const { start, end, ops } = batOps[batIndex]
      if (end - start === 1 && ops.length === 1 && ops[0].retain instanceof Delta) {
        const targetBlock = this.findBlocksByRange(start, 1)
        if (targetBlock.length === 1) {
          targetBlock[0].applyChanges(new Delta(ops))
        } else {
          console.error('some thing wrong')
        }
      } else {
        this.applyBatOps(start, end, ops)
      }
    }
  }

  private applyBatOps(start: number, end: number, ops: Op[]) {
    const oldBlocks = this.findBlocksByRange(start, end - start)
    const oldOps: Op[] = []
    if (oldBlocks[0].start > 0) {
      oldOps.push({ retain: oldBlocks[0].start })
    }
    oldBlocks.forEach(block => {
      oldOps.push(...block.toOp())
    })
    const oldDelta = new Delta(oldOps)
    if (start > 0) {
      ops.unshift({ retain: start })
    }
    const newDelta = oldDelta.compose(new Delta(ops))
    // 先把 newDelta 开头的 retain 都去掉，然后生成新的 block
    while (newDelta.ops[0].retain !== undefined && newDelta.ops[0].attributes === undefined) {
      newDelta.ops.shift()
    }
    const newBlocks = this.readDeltaToBlocks(newDelta)
    const oldBlocksStartIndex = this.findIndex(oldBlocks[0])
    this.splice(oldBlocksStartIndex, oldBlocks.length, newBlocks)
    const prevSibling = newBlocks[0].prevSibling
    if (prevSibling) {
      newBlocks[0].setPositionY(prevSibling.y + prevSibling.height, false, false)
    }
    // const listIdSet = this.findListIds(newBlocks)
    // if (listIdSet.size > 0) {
    //   this.markListItemToLayout(listIdSet)
    // }
    // const mergeStart = newBlocks[0].prevSibling ?? newBlocks[0]
    // const mergeEnd = newBlocks[newBlocks.length - 1].nextSibling ?? newBlocks[newBlocks.length - 1]
    // this.tryMerge(mergeStart, mergeEnd)
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
  }

  /**
   * 清除当前文档中的所有数据
   */
  public clear() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].destroy()
    }
    this.removeAll()
  }

  /**
   * 绘制当前文档
   * @param ctx canvas context
   * @param scrollTop 文档滚动位置
   * @param viewHeight 可视区域高度
   */
  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    this.startDrawingBlock = null
    this.endDrawingBlock = null
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.save()
    let current = this.head
    const viewportPosEnd = scrollTop + viewHeight
    let hasLayout = false // 这个变量用来记录整个绘制过程中是否有 block 需要排版
    // 绘制的主要逻辑是，当前视口前面的内容只用排版不用绘制
    // 当前视口中的内容排版并绘制
    // 当前视口后面的内容，放到空闲队列里面排版
    while (current !== null) {
      if (current.y < viewportPosEnd) {
        hasLayout = hasLayout || current.needLayout
        this.needRecalculateSelectionRect = this.needRecalculateSelectionRect ||
          (
            this.selection !== null &&
            current.needLayout &&
            hasIntersection(
              this.selection.index,
              this.selection.index + this.selection.length,
              current.start,
              current.start + current.length,
            )
          )
        current.layout()
        if (current.y + current.height >= scrollTop) {
          current.draw(ctx, scrollTop, viewHeight)
          if (this.startDrawingBlock === null) {
            this.startDrawingBlock = current
          }
        }
      } else if (current.needLayout) {
        if (this.firstScreenRender === 0) {
          this.firstScreenRender = window.performance.now() - (window as any).start
          console.log('first screen finished ', this.firstScreenRender)
        }
        // 当前视口后面的内容，放到空闲队列里面排版
        this.startIdleLayout(current)
        this.endDrawingBlock = current
        break
      }
      current = current.nextSibling
    }

    // 如果内容布局发生过变化，则选区也需要重新计算
    if (this.needRecalculateSelectionRect) {
      this.calSelectionRectangles()
      this.needRecalculateSelectionRect = false
    }
    // 绘制选区
    if (this.selectionRectangles.length > 0) {
      const startIndex = this.findSelectionArea(this.selectionRectangles, scrollTop)
      ctx.drawSelectionArea(this.selectionRectangles, scrollTop, scrollTop + viewHeight, startIndex)
    }

    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0) {
      if (hasLayout) {
        // 如果有内容排版过，就立刻重新搜索一次，这样本次绘制的就是最新的正确内容
        // 这里如果放到下一帧再绘制搜索结果，搜索结果会闪烁，用户体验不好
        this.search(this.searchKeywords, false)
      }
      if (this.searchResults.length > 0) {
        const startIndex = this.findStartSearchResult(this.searchResults, scrollTop)
        ctx.drawSearchResult(this.searchResults, scrollTop, scrollTop + viewHeight, startIndex, this.searchResultCurrentIndex)
      }
    }
    ctx.restore()
  }

  /**
   * 快速绘制，不包括排版等逻辑
   */
  public fastDraw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    this.startDrawingBlock = null
    this.endDrawingBlock = null
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.save()
    let current: Block | null = null
    // 如果 idleLayout 在执行过程中，说明有的 block 还没有被正确设置 y 坐标，此时不能直接用二分法查找目标 block，
    // 否可可能会拿到错误的 block，需要降级为从头遍历找目标 block
    // 这里应该不需要担心绘制的内容在需要排版的 block 后面，因为可视区域如果在需要排版的元素后面不会走 fastDraw 的逻辑
    if (this.idleLayoutRunning) {
      for (let childIndex = 0; childIndex < this.children.length; childIndex++) {
        const element = this.children[childIndex]
        if (isPointInRectangle(0, scrollTop, element)) {
          current = element
          break
        }
      }
    } else {
      current = findRectChildInPos(0, scrollTop, this.children)
    }
    if (current) {
      const viewportPosEnd = scrollTop + viewHeight
      this.startDrawingBlock = current
      while (current) {
        if (current.y < viewportPosEnd) {
          current.draw(ctx, scrollTop, viewHeight)
          this.endDrawingBlock = current
        } else {
          break
        }
        current = current.nextSibling
      }
    }
    // 绘制选区
    if (this.selectionRectangles.length > 0) {
      const startIndex = this.findSelectionArea(this.selectionRectangles, scrollTop)
      ctx.drawSelectionArea(this.selectionRectangles, scrollTop, scrollTop + viewHeight, startIndex)
    }
    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0 && this.searchResults.length > 0) {
      const startIndex = this.findStartSearchResult(this.searchResults, scrollTop)
      ctx.drawSearchResult(this.searchResults, scrollTop, scrollTop + viewHeight, startIndex, this.searchResultCurrentIndex)
    }
    ctx.restore()
  }

  /**
   * 获取文档内容长度
   */
  public getLength(): number {
    return this.children.reduce((sum, currentBlock: Block) => {
      return sum + currentBlock.length
    }, 0)
  }

  /**
   * 销毁当前文档
   */
  public destroy(): void {
    // TODO
    console.log('todo destroy document')
  }

  /**
   * 给文档设置新的尺寸信息
   * @param size 新尺寸信息
   */
  public setSize(size: { height?: number, width?: number }) {
    let changed = false
    if (size.height) {
      this.height = size.height
      changed = true
    }
    if (size.width) {
      this.width = size.width
      changed = true
    }
    if (changed) {
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    }
  }

  public getDocumentPos = (x: number, y: number): number => {
    let targetChild
    if (y < 0) {
      targetChild = this.head
    } else if (y > this.height) {
      targetChild = this.tail
    } else {
      // 如果在异步排版过程中，就不能用二分查找
      targetChild = findRectChildInPosY(y, this.children, this.idleLayoutStartBlock === null)
    }
    if (targetChild === null) { return -1 }
    return targetChild.getDocumentPos(x, y) + targetChild.start
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
   * 设置文档选区
   * @param index 位置索引
   * @param length 选区长度
   * @param reCalRectangle 是否立刻重新计算选区矩形
   */
  public setSelection(range: IRange | null, reCalRectangle = true) {
    if (this._selection !== range) {
      if (range === null || this._selection === null) {
        this._selection = range
      } else if (this._selection.index !== range.index || this._selection.length !== range.length) {
        this._selection = {
          index: range.index,
          length: range.length,
        }
      } else {
        // 如果新的 range 的 index 和 length 和之前的一样，就 do nothing
        return
      }
      // 如果在修改选择范围前刚刚更新过文档内容，则这里不需要立刻重新计算选区矩形，要把 reCalRectangle 置为 false
      // 因为这时文档还没有经过排版，计算此时计算矩形没有意义，draw 方法里面会判断要不要计算新的矩形范围
      // 而鼠标键盘操作导致的选择范围变更则要立刻重新计算新的矩形范围
      if (reCalRectangle) {
        this.calSelectionRectangles()
      }
      this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION, this._selection)
      this.updateCurrentFormat()
    }
  }

  public getSelection(): IRange | null {
    return this._selection
  }

  public setNeedRecalculateSelectionRect(need: boolean) {
    this.needRecalculateSelectionRect = need
  }

  /**
   * 将当前文档输出为 delta
   */
  public toDelta(): Delta {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      res.push(...element.toOp())
    }
    return new Delta(res)
  }

  /**
   * 将当前文档输出为 HTML
   */
  public toHtml(selection?: IRange): string {
    if (selection && selection.length > 0) {
      const endPos = selection.index + selection.length
      return this.children.map(b => {
        if (hasIntersection(b.start, b.start + b.length, selection.index, endPos)) {
          const index = Math.max(selection.index - b.start, 0)
          const length = Math.min(endPos, b.start + b.length) - index
          if (index === 0 && length === b.length) {
            return b.toHtml()
          } else {
            return b.toHtml({ index, length })
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
   * 给指定范围设置新的文档格式
   * @param attr 新格式数据
   * @param selection 需要设置格式的范围
   */
  public format(attr: IFragmentOverwriteAttributes, selection: IRange): Delta {
    const { index, length } = selection
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst)
    if (blocks.length <= 0) { return new Delta() }
    const oldOps: Op[] = []
    const newOps: Op[] = []
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      oldOps.push(...element.toOp())
      const offsetStart = Math.max(index - element.start, 0)
      element.format(
        attr,
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      )
      newOps.push(...element.toOp())
    }

    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
    this.updateCurrentFormat()
    // 如果长度是 0，还要尝试修改 nextFormat
    if (length === 0) {
      this.updateNextFormat(attr)
    }
    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (blocks[0].start > 0) {
      res.retain(blocks[0].start)
    }
    return res.concat(diff)
  }

  /**
   * 清除选区范围内容的格式
   * @param selection 需要清除格式的选区范围
   */
  public clearFormat(selection: IRange): Delta {
    const blocks = this.findBlocksByRange(selection.index, selection.length, EnumIntersectionType.rightFirst)
    if (blocks.length <= 0) { return new Delta() }
    const oldOps: Op[] = []
    const newOps: Op[] = []
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      oldOps.push(...element.toOp())
      const offsetStart = Math.max(selection.index - element.start, 0)
      element.clearFormat(
        offsetStart,
        Math.min(element.start + element.length, selection.index + selection.length) - element.start - offsetStart,
      )
      newOps.push(...element.toOp())
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (blocks[0].start > 0) {
      res.retain(blocks[0].start)
    }
    return res.concat(diff)
  }

  /**
   * 获取指定范围的文档内容格式信息
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const res: { [key: string]: Set<any> } = {}
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst)
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      const offsetStart = Math.max(index - element.start, 0)
      collectAttributes(
        element.getFormat(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        ), res)
    }
    return res
  }

  /**
   * 搜索，返回所有搜索结果的 index
   * @param trigger 是否触发事件
   */
  public search(keywords: string, trigger = true): ISearchResult[] {
    this.searchKeywords = keywords
    const res: ISearchResult[] = []
    for (let blockIndex = 0; blockIndex < this.children.length; blockIndex++) {
      const block = this.children[blockIndex]
      const searchResult = block.search(keywords)
      if (searchResult.length > 0) {
        res.push(...searchResult)
      }
    }
    this.searchResults = res

    if (res.length > 0) {
      if (this.searchResultCurrentIndex === undefined || this.searchResultCurrentIndex >= res.length) {
        this.searchResultCurrentIndex = 0
      }
    } else {
      this.searchResultCurrentIndex = undefined
    }

    if (trigger) {
      this.em.emit(EventName.DOCUMENT_CHANGE_SEARCH_RESULT,
        this.searchResults,
        this.searchResultCurrentIndex,
      )
    }
    return res
  }

  /**
   * 指定当前搜索结果的索引（在搜索结果中点击‘上一项’、‘下一项’的时候用）
   */
  public setSearchResultCurrentIndex(index: number) {
    index = Math.max(0, index)
    index = Math.min(this.searchResults.length - 1, index)
    this.searchResultCurrentIndex = index
    this.em.emit(EventName.DOCUMENT_CHANGE_SEARCH_RESULT,
      this.searchResults,
      this.searchResultCurrentIndex,
    )
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false): Delta {
    if (this.searchResults.length <= 0 || this.searchResultCurrentIndex === undefined) { return new Delta() }
    let res: Delta = new Delta()
    let resetStart: Block | undefined
    if (all) {
      let currentBlock = this.tail
      for (let i = this.searchResults.length - 1; i >= 0; i--) {
        const targetResult = this.searchResults[i]
        while (currentBlock) {
          if (currentBlock.start <= targetResult.pos) {
            const ops = currentBlock.replace(targetResult.pos - currentBlock.start, this.searchKeywords.length, replaceWords)
            if (currentBlock.start > 0) {
              ops.unshift({ retain: currentBlock.start })
            }
            res = res.compose(new Delta(ops))
            break
          } else {
            currentBlock = currentBlock.prevSibling
          }
        }
      }
      resetStart = currentBlock!
    } else {
      const targetResult = this.searchResults[this.searchResultCurrentIndex]
      const blocks = this.findBlocksByRange(targetResult.pos, this.searchKeywords.length)
      if (blocks.length > 0) {
        const ops = blocks[0].replace(targetResult.pos - blocks[0].start, this.searchKeywords.length, replaceWords)
        resetStart = resetStart || blocks[0]

        if (blocks[0].start > 0) {
          ops.unshift({ retain: blocks[0].start })
        }
        res = new Delta(ops)
      }
    }
    if (resetStart) {
      resetStart.setStart(resetStart.start, true, true)
    }
    this.search(this.searchKeywords)
    return res
  }

  /**
   * 清除搜索状态
   */
  public clearSearch() {
    this.searchResults.length = 0
    this.searchKeywords = ''
    this.searchResultCurrentIndex = undefined
    this.em.emit(EventName.DOCUMENT_CHANGE_SEARCH_RESULT,
      this.searchResults,
      this.searchResultCurrentIndex,
    )
  }

  /**
   * 计算选区矩形位置，文档中光标的位置也是根据这个值得来的
   * @param correctByPosY 用来修正最终计算结果的 y 坐标
   */
  public calSelectionRectangles(correctByPosY?: number) {
    this.selectionRectangles = []
    if (this._selection !== null) {
      if (typeof correctByPosY === 'number') {
        correctByPosY = Math.max(0, correctByPosY)
        correctByPosY = Math.min(this.height, correctByPosY)
      }
      const { index, length } = this._selection
      if (length === 0) {
        // 如果长度是 0，说明是光标状态
        const blocks = this.findBlocksByRange(index, length)
        this.selectionRectangles = blocks[blocks.length - 1].getSelectionRectangles(index, length, correctByPosY)
      } else {
        // 如果长度不是 0，说明是选区状态
        this.findBlocksByRange(index, length).forEach((block) => {
          this.selectionRectangles.push(...block.getSelectionRectangles(index, length, correctByPosY))
        })
      }
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION_RECTANGLE)
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.Default
  }
  // #region IPointerInteractive methods
  public onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerLeave(): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerDown(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerUp(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerTap(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  // #endregion

  public bubbleUp(type: string, data: any, stack: any[]): void {
    if (type === BubbleMessage.NEED_LAYOUT) {
      // 如果子元素声明需要重新排版，那么 stack 中最后一个元素就肯定是需要排版的 block
      const target = stack[stack.length - 1] as Block
      if (target && (!this.idleLayoutStartBlock || this.idleLayoutStartBlock.start > target.start)) {
        this.idleLayoutStartBlock = target
        this.em.emit(EventName.DOCUMENT_NEED_LAYOUT)
      }
      return
    }
    if (type === BubbleMessage.NEED_DRAW) {
      this.em.emit(EventName.DOCUMENT_NEED_DRAW)
      return
    }
    this.em.emit(type, data, stack)
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(index: number, blocks: Block[], attr?: Partial<ILayoutFrameAttributes>) {
    blocks = blocks || this.findBlocksByRange(index, 0)
    if (index === 0 || blocks.length === 2) {
      const targetBlock = index === 0 ? this.head : blocks[1]
      if (targetBlock) {
        const newBlock = targetBlock.insertEnter(index - targetBlock.start, attr)
        if (newBlock) {
          this.addAfter(newBlock, targetBlock)
        }
      }
    } else if (blocks.length === 1) {
      const newBlock = blocks[0].insertEnter(index - blocks[0].start, attr)
      if (newBlock) {
        this.addAfter(newBlock, blocks[0])
      }
    } else {
      console.error('the blocks.length should not be ', blocks.length)
    }
  }

  /**
   * 在 document 里面找到设计到 range 范围的 block
   * @param index range 的开始位置
   * @param length range 的长度
   */
  public findBlocksByRange(index: number, length: number, intersectionType = EnumIntersectionType.both): Block[] {
    return findChildrenByRange<Block>(this.children, index, length, intersectionType)
  }

  /**
   * 排版
   */
  public layout() {
    for (let index = 0; index < this.children.length; index++) {
      this.children[index].layout()
    }
  }

  /**
   * 开始 idle layout
   * @param block layout 起始 block
   */
  private startIdleLayout(block: Block) {
    if (!this.idleLayoutStartBlock || block.start < this.idleLayoutStartBlock.start) {
      this.idleLayoutStartBlock = block
      if (!this.idleLayoutRunning) {
        requestIdleCallback(this.runIdleLayout)
      }
    }
  }

  private runIdleLayout = (deadline: { timeRemaining: () => number, didTimeout: boolean }) => {
    if (this.idleLayoutStartBlock) {
      this.idleLayoutRunning = true
      let currentBlock: Block | undefined | null = this.idleLayoutStartBlock
      this.idleLayoutStartBlock = null
      let hasLayout = false // 这个变量用来几个当前这个 idleLayout 过程中是否有 block 排过版
      let needRecalculateSelectionRect = false
      while (deadline.timeRemaining() > 5 && currentBlock !== undefined && currentBlock !== null) {
        if (currentBlock.needLayout) {
          hasLayout = hasLayout || currentBlock.needLayout
          needRecalculateSelectionRect = needRecalculateSelectionRect ||
            (
              this.selection !== null &&
              currentBlock.needLayout &&
              hasIntersection(
                this.selection.index,
                this.selection.index + this.selection.length,
                currentBlock.start,
                currentBlock.start + currentBlock.length,
              )
            )
          currentBlock.layout()
        }
        currentBlock = currentBlock.nextSibling
      }

      if (needRecalculateSelectionRect) {
        this.calSelectionRectangles()
      }

      // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
      if (this.searchKeywords.length > 0 && hasLayout) {
        // 这里重新搜索但不触发绘制逻辑，因为这里是可视区域外的内容，暂时不用绘制
        this.search(this.searchKeywords, false)
      }

      if (currentBlock !== null && currentBlock !== undefined) {
        // 说明还没有排版完成
        this.idleLayoutStartBlock = currentBlock
        // 如果初次排版都没有完成，就要更新一次文档高度
        if (this.initLayout === false) {
          this.setSize({ height: currentBlock.y })
        }
      }
      requestIdleCallback(this.runIdleLayout)
    } else {
      this.idleLayoutRunning = false
      this.initLayout = true
      console.log('idle finished', performance.now() - (window as any).start)
    }
  }

  /**
   * 将指定 list id 的 listitem 标记为需要排版
   * @param listIds list id
   */
  public markListItemToLayout(listIds: Set<number>) {
    if (listIds.size > 0) {
      for (let blockIndex = 0; blockIndex < this.children.length; blockIndex++) {
        const element = this.children[blockIndex]
        if (element instanceof ListItem && listIds.has(element.attributes.listId)) {
          element.needLayout = true
        }
      }
    }
  }

  /**
   * 将一组 block 中所有的 listId 都找出来
   */
  private findListIds(blocks: Block[]): Set<number> {
    const res: Set<number> = new Set()
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]
      if (block instanceof ListItem) {
        res.add(block.attributes.listId)
      }
    }
    return res
  }

  /**
   * 根据当前选区更新当前选区格式
   */
  private updateCurrentFormat() {
    if (this.selection === null) {
      this.currentFormat = null
    } else {
      const { index, length } = this.selection
      this.currentFormat = this.getFormat(index, length)
    }
    this.nextFormat = this.currentFormat
    this.em.emit(EventName.DOCUMENT_CHANGE_FORMAT, this.nextFormat)
  }

  /**
   * 更新 nextFormat
   * @param attr 更新的样式内容
   */
  private updateNextFormat(attr: IFragmentOverwriteAttributes) {
    if (this.nextFormat === null) {
      console.error('the nextFormat should not be null')
      return
    }
    let formatChanged = false

    const keys = Object.keys(attr)
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      if (this.nextFormat.hasOwnProperty(key) && !this.nextFormat[key].has(attr[key])) {
        this.nextFormat[key] = (new Set().add(attr[key]))
        formatChanged = true
      }
    }

    if (formatChanged) {
      this.nextFormat = { ...this.nextFormat }
      this.em.emit(EventName.DOCUMENT_CHANGE_FORMAT, this.nextFormat)
    }
  }

  /**
   * 查找从第几个结果开始绘制搜索结果
   */
  private findStartSearchResult(searchResults: ISearchResult[], scrollTop: number): number {
    let low = 0
    let high = searchResults.length - 1

    let mid = Math.floor((low + high) / 2)
    while (high > low + 1) {
      const midValue = searchResults[mid].rects[0].y
      if (midValue <= scrollTop) {
        low = mid
      } else if (midValue > scrollTop) {
        high = mid
      }
      mid = Math.floor((low + high) / 2)
    }

    for (; mid >= 0; mid--) {
      if (searchResults[mid].rects[0].y + searchResults[mid].rects[0].height < scrollTop) {
        break
      }
    }
    mid = Math.max(mid, 0)

    return mid
  }

  /**
   * 查找从第几个选区矩形开始绘制选区矩形
   */
  private findSelectionArea(selectionArea: IRectangle[], scrollTop: number): number {
    let low = 0
    let high = selectionArea.length - 1

    let mid = Math.floor((low + high) / 2)
    while (high > low + 1) {
      const midValue = selectionArea[mid].y
      if (midValue < scrollTop) {
        low = mid
      } else if (midValue > scrollTop) {
        high = mid
      } else if (midValue === scrollTop) {
        break
      }
      mid = Math.floor((low + high) / 2)
    }

    for (; mid >= 0; mid--) {
      if (selectionArea[mid].y + selectionArea[mid].height < scrollTop) {
        break
      }
    }
    mid = Math.max(mid, 0)

    return mid
  }

  /**
   * 获取一系列 block 的 Op
   */
  public getBlocksOps(blocks: Block[]): Op[] {
    const res = []
    for (let index = 0; index < blocks.length; index++) {
      const element = blocks[index]
      res.push(...element.toOp())
    }
    return res
  }

  private readDeltaToBlocks(delta: Delta): Block[] {
    const blocks: Block[] = []

    const opCache: Op[] = []
    // 顺序遍历所有的 op，如果遇到某个 op 的 attributes 上有 block 属性就创建对应的 block
    for (let index = 0; index < delta.ops.length; index++) {
      const op = delta.ops[index]
      opCache.push(op)
      if (typeof op.attributes?.block === 'string') {
        const BlockClass = StructureRegistrar.getBlockClass(op.attributes.block)
        if (BlockClass) {
          const block = new BlockClass()
          block.setSize({ width: editorConfig.canvasWidth })
          block.readFromOps(opCache)
          blocks.push(block)
        } else {
          console.warn('unknown block type: ', op.attributes.block)
        }
        opCache.length = 0
      }
    }
    return blocks
  }

  /**
   * 从 end 位置开始尝试合并相邻的 block
   */
  public tryMerge(start: Block, end: Block) {
    let canStop = false
    let current = start
    while (current && current.nextSibling) {
      if (current === end) {
        canStop = true
      }
      if (current.needMerge && current.constructor === current.nextSibling.constructor) {
        current.merge(current.nextSibling)
        current.needLayout = true
        this.remove(current.nextSibling)
      } else if (canStop) {
        break
      } else {
        current = current.nextSibling
      }
    }
  }
}
