import Delta from 'quill-delta-enhanced'
import type Op from 'quill-delta-enhanced/dist/Op'
import type Document from '../DocStructure/Document'
import type IRange from '../Common/IRange'
import type Block from '../DocStructure/Block'
import { cloneDocPos, compareDocPos, findChildIndexInDocPos, findChildInDocPos, moveDocPos } from '../Common/util'
import BlockCommon from '../DocStructure/BlockCommon'
import type { HistoryStackService } from './HistoryStackService'
import type SelectionService from './SelectionService'
import { EnumSelectionSource } from './SelectionService'
import type { DocPos } from '../Common/DocPos'
import { moveRight } from '../Common/DocPos'
import ListItem from '../DocStructure/ListItem'
import { EventName } from '../Common/EnumEventName'
import Service from './Service'
import type Fragment from '../Fragment/Fragment'

export enum ContentServiceEventNames {
  AFTER_APPLY = 'AFTER_APPLY',
}
export default class ContentService extends Service {
  private stack: HistoryStackService
  private selector: SelectionService
  private compositionStartOps: Op[] = []
  private compositionStartPos: DocPos | null = null
  private compositionEndPos: DocPos | null = null

  constructor(doc: Document, stack: HistoryStackService, selector: SelectionService) {
    super(doc)
    this.stack = stack
    this.selector = selector
  }

  public input(content: string, format?: any) {
    let finalDelta = new Delta()
    const selection = this.selector.getSelection()
    if (selection && selection.length > 0) {
      for (let index = selection.length - 1; index >= 0; index--) {
        const range = selection[index]
        if (compareDocPos(range.start, range.end) !== 0) {
          const diff = this.doc.delete([range])
          finalDelta = finalDelta.compose(diff)
        }
      }
      const insertPos = selection[0].start

      const insertDiff = this.doc.insertText(content, insertPos, format)
      finalDelta = finalDelta.compose(insertDiff)

      this.pushDelta(finalDelta)
      const newPos = moveRight(insertPos, content.length)
      this.selector.setSelection([{ start: newPos, end: newPos }], EnumSelectionSource.Input)
    }
  }

  public delete(forward: boolean, range?: IRange[]): Delta | undefined {
    const selection = range || this.selector.getSelection()
    if (selection && selection.length > 0) {
      let finalDelta = new Delta()
      for (let index = selection.length - 1; index >= 0; index--) {
        const range = selection[index]
        const diff = this.doc.delete([range], forward)
        finalDelta = finalDelta.compose(diff)
      }

      this.pushDelta(finalDelta)
      if (finalDelta.ops.length > 0) {
        let newPos: DocPos = { index: 0, inner: null }
        if (
          selection.length > 1 ||
          (selection.length === 1 && compareDocPos(selection[0].start, selection[0].end) !== 0)
        ) {
          newPos = selection[0].start
          const blocks = this.getBlocksInRange({ start: newPos, end: newPos })
          if (blocks.length > 0) {
            const correctNewPos = blocks[0].correctSelectionPos(newPos, newPos)
            if (correctNewPos.length > 0 && correctNewPos[0].start) {
              newPos = correctNewPos[0].start
            }
          }
        } else if (selection.length === 1) {
          newPos = moveDocPos(selection[0].start, forward ? -1 : 0)
        }
        this.selector.setSelection([{ start: newPos, end: newPos }], EnumSelectionSource.Input)
      }
      return finalDelta
    }
  }

  public startComposition(selection: IRange[]) {
    // 先删除所有选区内容
    const toDeleteRange = selection.filter((r) => compareDocPos(r.start, r.end) !== 0)
    this.delete(true, toDeleteRange)

    const targetBlock = findChildInDocPos(selection[0].start.index, this.doc.children, true)
    if (targetBlock) {
      this.compositionStartOps = targetBlock.toOp(true)
      this.compositionStartPos = cloneDocPos(selection[0].start)
      this.compositionEndPos = cloneDocPos(selection[0].start)
    }
  }

  public updateComposition(pos: DocPos, content: string, attr: any) {
    if (this.compositionStartPos && pos) {
      if (compareDocPos(this.compositionStartPos, pos) !== 0) {
        this.doc.delete([
          {
            start: this.compositionStartPos,
            end: pos,
          },
        ])
      }
      this.doc.insertText(content, this.compositionStartPos, { ...attr, composing: true })
      this.compositionEndPos = moveDocPos(this.compositionStartPos, content.length)
      this.selector.setSelection(
        [
          {
            start: cloneDocPos(this.compositionEndPos)!,
            end: cloneDocPos(this.compositionEndPos)!,
          },
        ],
        EnumSelectionSource.Input,
      )
    }
  }

  public endComposition(finalContent: string) {
    if (this.compositionStartPos && this.compositionEndPos) {
      this.doc.delete([
        {
          start: this.compositionStartPos,
          end: this.compositionEndPos,
        },
      ])
      this.doc.insertText(finalContent, this.compositionStartPos)
      const targetBlock = findChildInDocPos(this.compositionStartPos.index, this.doc.children, true)
      if (targetBlock) {
        const diff = new Delta(this.compositionStartOps).diff(new Delta(targetBlock.toOp(true)))
        const res = new Delta()
        if (targetBlock.start > 0) {
          res.retain(targetBlock.start)
        }
        this.compositionStartOps = []
        this.compositionStartPos = null
        this.compositionEndPos = null
        this.pushDelta(res.concat(diff))
      }
    }
  }

  public format(attr: any, range?: IRange[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      const diff = this.doc.format(attr, selection)
      this.pushDelta(diff)
    }
  }

  public clearFormat(range?: IRange[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      const diff = this.doc.clearFormat(selection)
      this.pushDelta(diff)
    }
  }

  public getFormat(ranges: IRange[]): { [key: string]: Set<any> } {
    return this.doc.getFormat(ranges)
  }

  /**
   * 添加链接
   */
  public setLink(url: string, range?: IRange[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      selection.forEach((r) => {
        if (compareDocPos(r.start, r.end) === 0) {
          // 如果没有选区就先插入一段文本
          this.doc.insertText(url, r.start)
        }
        this.doc.format({ link: url }, [r])
      })
    }
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, range?: IRange[]) {
    const selection = range || this.selector.getSelection()
    selection.forEach((r) => {
      const startBlock = findChildInDocPos(r.start.index, this.doc.children, true)
      const endBlock = findChildInDocPos(r.start.index, this.doc.children, true)

      const blockCommons: BlockCommon[] = []
      let currentBlock = startBlock
      while (currentBlock) {
        if (currentBlock instanceof BlockCommon) {
          blockCommons.push(currentBlock)
        }
        if (currentBlock === endBlock) {
          break
        }
        currentBlock = currentBlock.nextSibling
      }
      if (blockCommons.length <= 0) {
        return new Delta()
      }
      const oldOps: Op[] = []
      const newOps: Op[] = []
      for (let i = 0; i < blockCommons.length; i++) {
        const element = blockCommons[i]
        oldOps.push(...element.toOp(true))
        blockCommons[i].setIndent(increase)
        newOps.push(...element.toOp(true))
      }

      const diff = new Delta(oldOps).diff(new Delta(newOps))
      const res = new Delta()
      if (blockCommons[0].start > 0) {
        res.retain(blockCommons[0].start)
      }
      this.pushDelta(res.concat(diff))
    })
  }

  public insertFragment(frag: Fragment, range?: IRange[]) {
    let finalDelta: Delta | undefined
    const selection = range || this.selector.getSelection()
    if (selection.length === 0) {
      return
    } else if (selection.length > 1 || compareDocPos(selection[0].start, selection[0].end) !== 0) {
      finalDelta = this.doc.delete(selection, true)
    }
    const insertPos = selection[0].start
    finalDelta = finalDelta ?? new Delta()
    const diff = this.doc.insertFragment(frag, insertPos)
    if (diff) {
      finalDelta = finalDelta.compose(diff)
    }
    this.pushDelta(finalDelta)
    this.selector.setSelection([{ start: insertPos, end: insertPos }], EnumSelectionSource.Input)
  }

  public insertBlock(block: Block, range?: IRange[]) {
    let finalDelta: Delta | undefined
    const selection = range || this.selector.getSelection()
    if (selection.length === 0) {
      return
    } else if (selection.length > 1 || compareDocPos(selection[0].start, selection[0].end) !== 0) {
      finalDelta = this.doc.delete(selection, true)
    }
    const insertPos = selection[0].start
    finalDelta = finalDelta ?? new Delta()
    const diff = this.doc.insertBlock(block, insertPos)
    if (diff) {
      finalDelta = finalDelta.compose(diff)
    }
    this.pushDelta(finalDelta)
    this.selector.setSelection([{ start: insertPos, end: insertPos }], EnumSelectionSource.Input)
  }

  public applyChanges(delta: Delta) {
    const oldBlocks: Block[] = []
    const newBlocks: Block[] = []
    let currentIndex = 0
    let lastOpPos = 0
    let currentBat: { startIndex: number; endIndex: number; ops: Op[] } = { startIndex: 0, endIndex: 0, ops: [] }
    for (let index = 0; index < delta.ops.length; index++) {
      const op = delta.ops[index]

      if (op.retain !== undefined) {
        if (typeof op.retain === 'number') {
          if (op.attributes === undefined) {
            currentIndex += op.retain
            const newCurrentBlockIndex = findChildIndexInDocPos(currentIndex, this.doc.children)
            if (newCurrentBlockIndex !== currentBat.endIndex) {
              const { oldBlocks: oldB, newBlocks: newB } = this.applyBat(currentBat)
              oldBlocks.push(...oldB)
              newBlocks.push(...newB)
              const baseOps: Op[] = []
              if (currentIndex - this.doc.children[newCurrentBlockIndex].start) {
                baseOps.push({ retain: currentIndex - this.doc.children[newCurrentBlockIndex].start })
              }
              lastOpPos = currentIndex
              currentBat = { startIndex: newCurrentBlockIndex, endIndex: newCurrentBlockIndex, ops: baseOps }
            }
          } else {
            if (currentIndex - lastOpPos > 0) {
              currentBat.ops.push({ retain: currentIndex - lastOpPos })
            }
            currentBat.ops.push(op)
            currentIndex += op.retain
            lastOpPos = currentIndex
            currentBat.endIndex = findChildIndexInDocPos(currentIndex, this.doc.children)
          }
        } else {
          if (currentIndex - lastOpPos > 0) {
            currentBat.ops.push({ retain: currentIndex - lastOpPos })
          }
          currentBat.ops.push(op)
          currentIndex += 1
          lastOpPos = currentIndex
          currentBat.endIndex = findChildIndexInDocPos(currentIndex, this.doc.children)
        }
      } else if (op.insert !== undefined) {
        if (currentIndex - lastOpPos > 0) {
          currentBat.ops.push({ retain: currentIndex - lastOpPos })
        }
        currentBat.ops.push(op)
        lastOpPos = currentIndex
      } else if (op.delete !== undefined) {
        if (currentIndex - lastOpPos > 0) {
          currentBat.ops.push({ retain: currentIndex - lastOpPos })
        }
        currentBat.ops.push(op)
        currentIndex += op.delete
        lastOpPos = currentIndex
        currentBat.endIndex = findChildIndexInDocPos(currentIndex, this.doc.children)
      }
    }
    // 循环完了之后把 currentBat 里面没处理的都处理掉
    if (currentBat.ops.length > 0) {
      const { oldBlocks: oldB, newBlocks: newB } = this.applyBat(currentBat)
      oldBlocks.push(...oldB)
      newBlocks.push(...newB)
    }

    this.emit(ContentServiceEventNames.AFTER_APPLY, { oldBlocks, newBlocks })
    // 最后触发重绘
    this.doc.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
  }

  public getBlocksInRange(range: IRange): Block[] {
    const startBlock = findChildInDocPos(range.start.index, this.doc.children, true)
    const endBlock = findChildInDocPos(range.end.index, this.doc.children, true)

    const blocks: Block[] = []
    let currentBlock = startBlock
    while (currentBlock) {
      blocks.push(currentBlock)
      if (currentBlock === endBlock) {
        break
      }
      currentBlock = currentBlock.nextSibling
    }
    return blocks
  }

  private pushDelta(diff: Delta) {
    if (diff.ops.length > 0) {
      this.stack.pushDiff(diff)
    }
  }

  // 记录当前的 block
  // 如果是 retain 数字，看当前 block 是否发生变化，没有变化就继续，有变化就处理前一批
  // 如果是 retain delta，追加操作到当前批
  // 如果是 insert，追加操作到当前批
  // 如果是 delete, 追加操作到当前批且更新当前 block

  private applyBat(data: { startIndex: number; endIndex: number; ops: Op[] }): {
    oldBlocks: Block[]
    newBlocks: Block[]
  } {
    if (data.ops.length === 0) {
      return {
        oldBlocks: [],
        newBlocks: [],
      }
    }
    const affectedListId = new Set<number>()
    const oldBlocks = this.doc.children.slice(data.startIndex, data.endIndex + 1)
    const oldOps: Op[] = []
    // 看一下有没有 list item，有的话要记录一下
    for (let i = 0; i < oldBlocks.length; i++) {
      const oldBlock = oldBlocks[i]
      if (oldBlock instanceof ListItem) {
        affectedListId.add(oldBlock.attributes.listId)
      }
      oldOps.push(...oldBlock.toOp(false))
    }

    const opDelta = new Delta(data.ops)
    const newOps = new Delta(oldOps).compose(opDelta).ops
    // 去掉最前面的 retain 操作
    while (newOps.length > 0 && typeof newOps[0].retain === 'number') {
      newOps.shift()
    }
    const newBlocks = this.doc.readDeltaToBlocks(new Delta(newOps))

    // 看一下新 block 有没有 list item，有的话要记录一下
    for (let i = 0; i < newBlocks.length; i++) {
      const newBlock = newBlocks[i]
      if (newBlock instanceof ListItem) {
        affectedListId.add(newBlock.attributes.listId)
      }
    }

    // 替换
    this.doc.splice(data.startIndex, data.endIndex + 1 - data.startIndex, newBlocks)

    // 尝试合并 block
    const mergeStart = newBlocks[0].prevSibling ?? newBlocks[0]
    const mergeEnd = newBlocks[newBlocks.length - 1].nextSibling ?? newBlocks[newBlocks.length - 1]
    this.doc.tryMerge(mergeStart, mergeEnd)

    // 设置 start 和 y 坐标
    newBlocks[0].setStart(oldBlocks[0].start, true, true, true)
    newBlocks[0].setPositionY(oldBlocks[0].y, false, true)
    // 还要对选区进行 transform
    this.selector.applyChanges(opDelta)

    return {
      oldBlocks,
      newBlocks,
    }
  }
}
