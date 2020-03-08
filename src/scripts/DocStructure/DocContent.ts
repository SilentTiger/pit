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

  public em: EventEmitter = new EventEmitter();
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public contentHeight: number = 0;
  public length: number = 0;
  public readonly children: Block[] = [];

  public selection: IRange | null = null;

  // 选区变更时同时修改这个值和 nextFormat
  public currentFormat: { [key: string]: Set<any> } | null = null;
  // 选区长度为 0 时用工具栏改格式只改这个值，选区长度大于 0 时用工具栏改格式同时修改这个值和 currentFormat
  public nextFormat: { [key: string]: Set<any> } | null = null;

  public readFromChanges(delta: Delta) {
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
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const block = this.children[index]
      if (block.y + y + block.height > 0 && block.y < viewHeight) {
        block.draw(ctx, this.x + x, this.y + y, viewHeight - this.y)
      }
    }
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

  public setHeight(height: number) {
    height = Math.ceil(height)
    if (height >= this.contentHeight && height !== this.height) {
      this.height = height
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    }
  }

  public setContentHeight(height: number) {
    height = Math.ceil(height)
    if (this.contentHeight !== height) {
      this.contentHeight = height
      if (this.height < height) {
        this.height = height
        this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
      }
    }
  }

  public setWidth(width: number) {
    if (width !== this.width) {
      this.width = width
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    }
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
  public layout(start = 0) {
    for (let index = start; index < this.children.length; index++) {
      if (this.children[index].needLayout) {
        this.children[index].layout()
      }
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

  /**
   * 根据当前选区更新当前选区格式
   */
  protected updateCurrentFormat() {
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
  protected updateNextFormat(attr: IFragmentOverwriteAttributes) {
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
