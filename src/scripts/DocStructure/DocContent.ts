import * as EventEmitter from 'eventemitter3'
import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import replace from 'lodash/replace'
import { EventName } from '../Common/EnumEventName'
import ICanvasContext from '../Common/ICanvasContext'
import IRange from '../Common/IRange'
import { ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import { collectAttributes, EnumIntersectionType, findChildrenByRange, hasIntersection, findRectChildInPos, findRectChildInPosY, getRelativeDocPos, increaseId, findChildInDocPos, compareDocPos } from '../Common/util'
import editorConfig from '../IEditorConfig'
import Block from './Block'
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import ListItem from './ListItem'
import ILayoutFrameAttributes from './LayoutFrameAttributes'
import { IRenderStructure } from '../Common/IRenderStructure'
import { EnumCursorType } from '../Common/EnumCursorType'
import { IBubbleUpable } from '../Common/IBubbleElement'
import StructureRegistrar from '../StructureRegistrar'
import { IPointerInteractive, IPointerInteractiveDecorator } from '../Common/IPointerInteractive'
import { DocPos } from '../Common/DocPos'
import IRectangle from '../Common/IRectangle'
import { ISearchResult } from '../Common/ISearchResult'
import IRangeNew from '../Common/IRangeNew'
import IFragmentTextAttributes from './FragmentTextAttributes'

function OverrideLinkedListDecorator<T extends { new(...args: any[]): DocContent }>(constructor: T) {
  return class extends constructor {
    /**
     * 将一个 block 添加到当前 block
     * @param node 要添加的 block
     */
    public add(node: Block) {
      super.add(node)
      node.x = this.paddingLeft
      node.setWidth(this.width - this.paddingLeft - this.paddingRight)
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
      node.setWidth(this.width - this.paddingLeft - this.paddingRight)
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
      node.setWidth(this.width - this.paddingLeft - this.paddingRight)
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
  public readonly id: number = increaseId();
  public head: Block | null = null
  public tail: Block | null = null
  public needLayout: boolean = true

  public em: EventEmitter = new EventEmitter();
  public x: number = 0;
  public y: number = 0;
  public width: number = editorConfig.canvasWidth
  public height: number = 0
  public contentHeight: number = 0;
  public paddingTop: number = 0;
  public paddingBottom: number = 0;
  public paddingLeft: number = 0;
  public paddingRight: number = 0;
  public length: number = 0;
  public readonly children: Block[] = [];

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
    this.needLayout = true
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
    }
  }

  public setContentHeight(height: number) {
    height = Math.ceil(height)
    if (this.contentHeight !== height) {
      this.contentHeight = height + this.paddingBottom
      this.setHeight(height + this.paddingBottom)
    }
  }

  public setWidth(width: number) {
    if (width !== this.width) {
      this.width = width
      for (let index = 0; index < this.children.length; index++) {
        const block = this.children[index]
        block.needLayout = true
      }
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

  public search(keywords: string) {
    const res: ISearchResult[] = []
    for (let blockIndex = 0; blockIndex < this.children.length; blockIndex++) {
      const block = this.children[blockIndex]
      const searchResult = block.search(keywords)
      if (searchResult.length > 0) {
        res.push(...searchResult)
      }
    }
    return res
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false): Delta {
    // if (this.searchResults.length <= 0 || this.searchResultCurrentIndex === undefined) { return new Delta() }
    const res: Delta = new Delta()
    // let resetStart: Block | undefined
    // if (all) {
    //   let currentBlock = this.tail
    //   for (let i = this.searchResults.length - 1; i >= 0; i--) {
    //     const targetResult = this.searchResults[i]
    //     while (currentBlock) {
    //       if (currentBlock.start <= targetResult.pos) {
    //         const ops = currentBlock.replace(targetResult.pos - currentBlock.start, this.searchKeywords.length, replaceWords)
    //         if (currentBlock.start > 0) {
    //           ops.unshift({ retain: currentBlock.start })
    //         }
    //         res = res.compose(new Delta(ops))
    //         break
    //       } else {
    //         currentBlock = currentBlock.prevSibling
    //       }
    //     }
    //   }
    //   resetStart = currentBlock!
    // } else {
    //   const targetResult = this.searchResults[this.searchResultCurrentIndex]
    //   const blocks = this.findBlocksByRange(targetResult.pos, this.searchKeywords.length)
    //   if (blocks.length > 0) {
    //     const ops = blocks[0].replace(targetResult.pos - blocks[0].start, this.searchKeywords.length, replaceWords)
    //     resetStart = resetStart || blocks[0]

    //     if (blocks[0].start > 0) {
    //       ops.unshift({ retain: blocks[0].start })
    //     }
    //     res = new Delta(ops)
    //   }
    // }
    // if (resetStart) {
    //   resetStart.setStart(resetStart.start, true, true)
    // }
    // this.search(this.searchKeywords)
    return res
  }

  /**
   * 给指定范围设置新的文档格式
   * @param attr 新格式数据
   * @param range 需要设置格式的范围
   */
  public format(attr: IFragmentOverwriteAttributes, ranges: IRangeNew[]): Delta {
    let res = new Delta()
    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      let batRes = new Delta()
      const range = ranges[rangeIndex]
      const startBlock = this.findChildByDocPos(range.start.index)
      let endBlock = this.findChildByDocPos(range.end.index)
      if (!startBlock || !endBlock) continue
      if (endBlock.start === range.end.index && range.end.inner === null) {
        endBlock = endBlock.prevSibling
      }
      const oldOps = this.getOpFromLinkedBlocks(startBlock, endBlock)

      let currentBlock: Block | null = endBlock
      while (currentBlock) {
        const prev: Block | null = currentBlock.prevSibling
        if (currentBlock === startBlock) {
          if (currentBlock.start === range.start.index && range.start.inner === null) {
            currentBlock.format(attr)
          } else {
            currentBlock.format(attr, { start: range.start, end: { index: currentBlock.start + currentBlock.length, inner: null } })
          }
          break
        } else if (currentBlock === endBlock) {
          if (currentBlock.start + currentBlock.length === range.end.index && range.end.inner === null) {
            currentBlock.format(attr)
          } else {
            currentBlock.format(attr, { start: { index: currentBlock.start, inner: null }, end: range.end })
          }
        } else {
          currentBlock.format(attr)
        }
        currentBlock = prev
      }

      const newOps = this.getOpFromLinkedBlocks(startBlock, endBlock)

      // 最后把新老 op 做 diff
      const diff = (new Delta(oldOps)).diff(new Delta(newOps))
      if (startBlock.start > 0) {
        batRes.retain(startBlock.start)
      }
      batRes = batRes.concat(diff)
      res = res.compose(batRes)
    }

    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
    this.needLayout = true

    return res
  }

  /**
   * 清除选区范围内容的格式
   * @param ranges 需要清除格式的选区范围
   */
  public clearFormat(ranges: IRangeNew[]): Delta {
    let res = new Delta()
    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      let batRes = new Delta()
      const range = ranges[rangeIndex]
      const startBlock = this.findChildByDocPos(range.start.index)
      let endBlock = this.findChildByDocPos(range.end.index)
      if (!startBlock || !endBlock) continue
      if (endBlock.start === range.end.index && range.end.inner === null) {
        endBlock = endBlock.prevSibling
      }
      const oldOps = this.getOpFromLinkedBlocks(startBlock, endBlock)

      let currentBlock: Block | null = endBlock
      while (currentBlock) {
        const prev: Block | null = currentBlock.prevSibling
        if (currentBlock === startBlock) {
          if (currentBlock.start === range.start.index && range.start.inner === null) {
            currentBlock.clearFormat()
          } else {
            currentBlock.clearFormat({ start: range.start, end: { index: currentBlock.start + currentBlock.length, inner: null } })
          }
          break
        } else if (currentBlock === endBlock) {
          if (currentBlock.start + currentBlock.length === range.end.index && range.end.inner === null) {
            currentBlock.clearFormat()
          } else {
            currentBlock.clearFormat({ start: { index: currentBlock.start, inner: null }, end: range.end })
          }
        } else {
          currentBlock.clearFormat()
        }
        currentBlock = prev
      }

      const newOps = this.getOpFromLinkedBlocks(startBlock, endBlock)

      // 最后把新老 op 做 diff
      const diff = (new Delta(oldOps)).diff(new Delta(newOps))
      if (startBlock.start > 0) {
        batRes.retain(startBlock.start)
      }
      batRes = batRes.concat(diff)
      res = res.compose(batRes)
    }

    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
    this.needLayout = true

    return res
  }

  /**
   * 获取指定范围的文档内容格式信息
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public getFormat(ranges?: IRangeNew[]): { [key: string]: Set<any> } {
    const res: { [key: string]: Set<any> } = {}
    if (ranges) {
      for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
        const range = ranges[rangeIndex]
        const startBlock = this.findChildByDocPos(range.start.index)
        const endBlock = this.findChildByDocPos(range.end.index)
        let currentBlock = startBlock
        while (currentBlock) {
          collectAttributes(currentBlock.getFormat({
            start: getRelativeDocPos(currentBlock.start, range.start),
            end: getRelativeDocPos(currentBlock.start, range.end),
          }), res)
          if (currentBlock !== endBlock) {
            currentBlock = currentBlock.nextSibling
          } else {
            break
          }
        }
      }
    } else {
      for (let i = 0; i < this.children.length; i++) {
        collectAttributes(this.children[i].getFormat(), res)
      }
    }
    return res
  }

  /**
   * 删除指定范围内的内容
   * @param selection 要删除的内容范围
   * @param forward 是否为向前删除，true: 向前删除，相当于光标模式下按退格键； false：向后删除，相当于 win 上的 del 键
   */
  public delete(selection: IRangeNew[], forward: boolean = true): Delta {
    let res = new Delta()
    // 大致分为两种场景，1、没有选中内容，即处于光标模式下向前或向后删除  2、有选择内容的时候删除
    for (let selectionIndex = 0; selectionIndex < selection.length; selectionIndex++) {
      const range = selection[selectionIndex]
      if (compareDocPos(range.start, range.end) === 0) {
        // 1、没有选中内容，即处于光标模式下向前或向后删除
        // 这里又要区分 rang.start 的 inner 是否为 null，如果是 null 说明是 BlockCommon，走一半流程
        // 如果不是 null 说明是特殊的 block，比如 Table，就要调用 Block 自己的 delete 方法

        // 如果要删除的内容是目标 block 的最后一个元素，就属于特殊情况，要特别处理，否则就按普通规则处理或交给 block 自行处理
        // 因为要删除 block 的最后一个元素往往涉及到 block 内容的合并等操作
        const currentBlock = this.findChildByDocPos(range.start.index)
        if (!currentBlock) continue  // 说明选区数据有问题
        const diffStartBlock = forward && currentBlock.start === range.start.index && range.start.inner === null ? currentBlock.prevSibling : currentBlock
        const diffEndBlock = forward && currentBlock.start === range.start.index && range.start.inner === null ? currentBlock.nextSibling : currentBlock.nextSibling?.nextSibling ?? null
        if (diffStartBlock === null || diffEndBlock === null) continue
        const diffRetainStart = diffStartBlock?.start || 0
        const oldOps = this.getOpFromLinkedBlocks(diffStartBlock, diffEndBlock)
        if (forward) {
          if (currentBlock.start < range.start.index || range.start.inner !== null) {
            currentBlock.delete(range.start, range.end, true)
          } else if (currentBlock.prevSibling) {
            currentBlock.prevSibling.delete(range.start, range.end, true)
          } else {
            continue
          }
        } else {
          currentBlock.delete(range.start, range.end, false)
        }
        // 尝试合并
        this.tryEat(diffStartBlock, diffEndBlock)
        const newOps = this.getOpFromLinkedBlocks(diffStartBlock, diffEndBlock)
        // 最后把新老 op 做 diff
        const diff = (new Delta(oldOps)).diff(new Delta(newOps))
        res = res.compose(new Delta().retain(diffRetainStart).concat(diff))
      } else {
        // 2、有选择内容的时候删除
        const startBlock = this.findChildByDocPos(range.start.index)
        const endBlock = this.findChildByDocPos(range.end.index)
        if (!startBlock || !endBlock) continue
        const diffStartBlock = startBlock.start === range.start.index && range.start.inner === null
          ? startBlock.prevSibling
          : startBlock
        const diffEndBlock = endBlock.nextSibling
        const diffRetainStart = diffStartBlock?.start || 0
        let needTryMerge = diffStartBlock === startBlock

        // 先计算删除操作之前的 op
        const oldOps: Op[] = this.getOpFromLinkedBlocks(diffStartBlock, diffEndBlock)
        // 然后开始删除，分开始和结束在同一个 block 和 在不同的 block 两种情况
        if (startBlock === endBlock) {
          startBlock.delete(range.start, range.end, forward)
          needTryMerge = false
        } else {
          let currentBlock: Block | null = endBlock
          let beEatBlock: Block | null = null
          while (currentBlock) {
            const prev: Block | null = currentBlock.prevSibling
            if (currentBlock === startBlock) {
              if (currentBlock.start === range.start.index && range.start.inner === null) {
                // 说明要直接删除第一个 block
                this.remove(currentBlock)
              } else {
                currentBlock.delete(range.start, { index: currentBlock.start + currentBlock.length, inner: null }, forward)
              }
              break
            } else if (currentBlock === endBlock) {
              if (currentBlock.start + currentBlock.length === range.end.index && range.end.inner === null) {
                // 说明要直接删除最后一个 block
                this.remove(currentBlock)
                beEatBlock = diffEndBlock
              } else if (range.end.index === currentBlock.start && range.end.inner === null) {
                // 说明删除结束位置落在 currentBlock 的最开始位置，这时什么都不用做
                beEatBlock = currentBlock
              } else {
                currentBlock.delete({ index: currentBlock.start, inner: null }, range.end, forward)
                beEatBlock = endBlock
              }
            } else {
              // 既不是第一个 block 也不是最后一个 block 则直接删除这个 block
              this.remove(currentBlock)
            }
            currentBlock = prev
          }
          if (needTryMerge) {
            // 然后尝试合并
            if (startBlock.eat(beEatBlock!)) {
              this.remove(beEatBlock!)
            }
          }
        }

        // 再计算新的 op
        const newOps: Op[] = this.getOpFromLinkedBlocks(diffStartBlock, diffEndBlock)
        // 最后把新老 op 做 diff
        const diff = (new Delta(oldOps)).diff(new Delta(newOps))
        res = res.compose(new Delta().retain(diffRetainStart).concat(diff))

        if (diffStartBlock) {
          diffStartBlock.setStart(diffStartBlock.start, true, true)
          diffStartBlock.setPositionY(diffStartBlock.y, true, true)
        } else {
          this.head?.setStart(0, true, true)
          this.head?.setPositionY(0, true, true)
        }
      }
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
   * 插入操作
   * @param content 要插入的内容
   * @param composing 是否是输入法输入状态，输入法输入状态下不需要生成 delta
   */
  public insertText(content: string, pos: DocPos, composing: boolean, attr?: Partial<IFragmentTextAttributes>): Delta {
    let res = new Delta()

    // 开始插入逻辑之前，先把受影响的 block 的 delta 记录下来
    let insertStartDelta: Delta | undefined
    const startBlock = this.findChildByDocPos(pos.index)
    if (!startBlock) return res

    if (!composing) {
      insertStartDelta = new Delta(startBlock.toOp())
    }

    let { index } = pos
    content = replace(content, /\r/g, '') // 先把回车处理掉，去掉所有的 \r,只保留 \n
    const insertBat = content.split('\n')
    for (let batIndex = 0; batIndex < insertBat.length; batIndex++) {
      const batContent = insertBat[batIndex]
      const block = this.findChildByDocPos(index)
      if (!block) return new Delta()  // 如果这里 return 了说明逻辑出现了问题
      let lengthChanged = false
      if (batContent.length > 0) {
        if (block.insertText(batContent, { index: pos.index - block.start, inner: pos.inner }, composing, attr)) {
          index += batContent.length
          lengthChanged = true
        }
      }

      // 插入一个换行符
      if (batIndex < insertBat.length - 1) {
        if (this.insertEnter({ index, inner: pos.inner }, attr)) {
          index++
          lengthChanged = true
        }
      }

      if (lengthChanged && startBlock.nextSibling) {
        startBlock.nextSibling.setStart(startBlock.start + startBlock.length, true)
      }
    }

    // 这里要先触发 change 事件，然后在设置新的 pos
    // 因为触发 change 之后才能计算文档的新结构和长度，在这之前设置 pos 可能会导致错误
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
    this.needLayout = true

    // 插入逻辑完成后，将受影响的 block 的新的 delta 记录下来和之前的 delta 进行 diff
    if (!composing && insertStartDelta) {
      const endBlock = this.findChildByDocPos(index)
      const endOps: Op[] = this.getOpFromLinkedBlocks(startBlock, endBlock)
      const insertEndDelta = new Delta(endOps)
      const change = insertStartDelta.diff(insertEndDelta).ops
      if (startBlock.start > 0) {
        change.unshift({ retain: startBlock.start })
      }
      res = res.compose(new Delta(change))
    }
    return res
  }

  /**
   * 在指定位置插入一个换行符
   * @returns true: 成功插入且当前 docContent 长度要加 1，false: 没有成功插入，或虽然插入成功但当前 docContent 长度不变
   */
  public insertEnter(pos: DocPos, attr?: Partial<ILayoutFrameAttributes>): Delta | null {
    const targetBlock = this.findChildByDocPos(pos.index)
    if (!targetBlock) return null
    const oldOps = targetBlock.toOp()
    const newBlock = targetBlock.insertEnter({ index: pos.index - targetBlock.start, inner: pos.inner }, attr)
    const newOps = targetBlock.toOp()
    if (newBlock) {
      this.addAfter(newBlock, targetBlock)
      newBlock.setStart(targetBlock.start + targetBlock.length, true)
      newOps.push(...newBlock.toOp())
    }
    const res = new Delta()
    if (targetBlock.start > 0) {
      res.retain(targetBlock.start)
    }
    return res.concat((new Delta(oldOps)).diff(new Delta(newOps)))
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
    if (!this.needLayout) return
    for (let index = start; index < this.children.length; index++) {
      if (this.children[index].needLayout) {
        const child = this.children[index]
        child.x = this.paddingLeft
        if (index === 0) {
          child.y = this.paddingTop
        }
        child.setWidth(this.width - this.paddingLeft - this.paddingRight)
        child.layout()
      }
    }
    this.needLayout = false
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
   * 将所有 block 设置为需要排版
   */
  public setNeedToLayout() {
    this.needLayout = true
    for (let index = 0; index < this.children.length; index++) {
      this.children[index].needLayout = true
    }
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
          block.setWidth(this.width - this.paddingLeft - this.paddingRight)
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

  public tryEat(start: Block, end: Block) {
    let currentBlock = start
    while (currentBlock && currentBlock.nextSibling) {
      const eatRes = currentBlock.eat(currentBlock.nextSibling)
      if (eatRes) {
        this.remove(currentBlock.nextSibling)
        if (currentBlock.nextSibling !== end) {
          continue
        } else {
          break
        }
      } else {
        if (currentBlock.nextSibling !== end) {
          currentBlock = currentBlock.nextSibling
          continue
        } else {
          break
        }
      }
    }
  }

  /**
   * 计算指定的 x、y 坐标所指向的文档位置
   */
  public getDocumentPos(x: number, y: number, start = false): DocPos | null {
    let targetChild
    if (y < 0) {
      targetChild = this.head
    } else if (y > this.height) {
      targetChild = this.tail
    } else {
      // 如果在异步排版过程中，就不能用二分查找
      targetChild = findRectChildInPosY(y, this.children, true)
    }
    if (targetChild === null) { return null }
    const childPos = targetChild.getDocumentPos(x, y, start)
    if (childPos !== null) {
      childPos.index += targetChild.start
    }
    return childPos
  }

  /**
   * 根据选区获取选区矩形区域
   * @param start 选区相对当前 block 的开始位置
   * @param end 选区相对当前 block 的结束位置
   * @param {number | undefined} correctByPosY 用实际鼠标 y 坐标修正结果，在选区长度为 0 计算光标位置的时候要用这个参数
   */
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    const selectionRectangles: IRectangle[] = []
    let currentBlock: Block | null = this.head
    const startRetain = start.index
    const endRetain = end.index
    while (currentBlock) {
      if (hasIntersection(currentBlock.start, currentBlock.start + currentBlock.length, startRetain, endRetain + 1)) {
        selectionRectangles.push(...currentBlock.getSelectionRectangles(
          getRelativeDocPos(currentBlock.start, start),
          getRelativeDocPos(currentBlock.start, end),
          correctByPosY
        ))
      }
      if (currentBlock !== this.tail) {
        currentBlock = currentBlock.nextSibling
      } else {
        currentBlock = null
      }
    }
    return selectionRectangles
  }

  public findChildByDocPos(index: number, dichotomy = true) {
    return findChildInDocPos(index, this.children, dichotomy)
  }

  /**
   * 获取从 startBlock 到 endBlock 之间所有 block 的 Op
   * @param startBlock 如果 startBlock 为 null，说明从文档开头开始
   */
  private getOpFromLinkedBlocks(startBlock: Block | null, endBlock: Block | null): Op[] {
    const res: Op[] = []
    let currentOldBlock: Block | null = startBlock === null ? this.children[0] : startBlock
    while (currentOldBlock) {
      res.push(...currentOldBlock.toOp())
      if (currentOldBlock !== endBlock) {
        currentOldBlock = currentOldBlock.nextSibling
      } else {
        break
      }
    }
    return res
  }

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
}
