import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import Document from '../DocStructure/Document'
import IRangeNew from '../Common/IRangeNew'
import Block from '../DocStructure/Block'
import Paragraph from '../DocStructure/Paragraph'
import QuoteBlock from '../DocStructure/QuoteBlock'
import {
  cloneDocPos,
  compareDocPos,
  findChildIndexInDocPos,
  findChildInDocPos,
  increaseId,
  moveDocPos,
} from '../Common/util'
import BlockCommon from '../DocStructure/BlockCommon'
import { HistoryStackController } from './HistoryStackController'
import SelectionController from './SelectionController'
import { DocPos, moveRight } from '../Common/DocPos'
import { IFragmentOverwriteAttributes } from '../DocStructure/FragmentOverwriteAttributes'
import { EnumListType } from '../DocStructure/EnumListStyle'
import ListItem from '../DocStructure/ListItem'
import { EventName } from '../Common/EnumEventName'

export default class ContentController {
  private delta: Delta | null = null
  private doc: Document
  private stack: HistoryStackController
  private selector: SelectionController
  private composing = false
  private compositionStartOps: Op[] = []
  private compositionStartPos: DocPos | null = null
  private compositionEndPos: DocPos | null = null

  constructor(doc: Document, stack: HistoryStackController, selector: SelectionController) {
    this.doc = doc
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
      this.selector.setSelection([{ start: newPos, end: newPos }])
    }
  }

  public delete(forward: boolean, range?: IRangeNew[]): Delta | undefined {
    const selection = range || this.selector.getSelection()
    if (selection && selection.length > 0) {
      let finalDelta = new Delta()
      for (let index = selection.length - 1; index >= 0; index--) {
        const range = selection[index]
        const diff = this.doc.delete([range], forward)
        finalDelta = finalDelta.compose(diff)
      }

      this.pushDelta(finalDelta)
      let newPos: DocPos = { index: 0, inner: null }
      if (
        selection.length > 1 ||
        (selection.length === 1 && compareDocPos(selection[0].start, selection[0].end) !== 0)
      ) {
        newPos = selection[0].start
      } else if (selection.length === 1) {
        newPos = moveDocPos(selection[0].start, forward ? -1 : 0)
      }
      this.selector.setSelection([{ start: newPos, end: newPos }])
      return finalDelta
    }
  }

  public startComposition(selection: IRangeNew[]) {
    this.composing = true
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
      this.selector.setSelection([
        {
          start: cloneDocPos(this.compositionEndPos)!,
          end: cloneDocPos(this.compositionEndPos)!,
        },
      ])
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
        this.composing = false
        this.compositionStartOps = []
        this.compositionStartPos = null
        this.compositionEndPos = null
        this.pushDelta(res.concat(diff))
      }
    }
  }

  public format(attr: IFragmentOverwriteAttributes, range?: IRangeNew[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      const diff = this.doc.format(attr, selection)
      this.pushDelta(diff)
    }
  }

  public clearFormat(range?: IRangeNew[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      const diff = this.doc.clearFormat(selection)
      this.pushDelta(diff)
    }
  }

  public getFormat(ranges: IRangeNew[]): { [key: string]: Set<any> } {
    return this.doc.getFormat(ranges)
  }

  /**
   * 添加链接
   */
  public setLink(url: string, range?: IRangeNew[]) {
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
  public setIndent(increase: boolean, range?: IRangeNew[]) {
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

  /**
   * 设置引用块
   */
  public setQuoteBlock(range?: IRangeNew[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      selection.forEach((r) => {
        const blocks: Block[] = this.getBlocksInRange(r)

        const quoteBlocks = blocks.filter((blk: Block) => blk instanceof QuoteBlock)
        let diffDelta: Delta | undefined
        if (quoteBlocks.length === blocks.length) {
          // 如果所有的 block 都是 quoteblock 就取消所有的 quoteblock
          this.setParagraph(range)
        } else {
          const oldOps: Op[] = []
          // 如果存在不是 quoteblock 的 block，就把他设置成 quoteblock，注意这里可能还需要合并前后的 quoteblock
          let startQuoteBlock: QuoteBlock
          if (blocks[0].prevSibling instanceof QuoteBlock) {
            startQuoteBlock = blocks[0].prevSibling
            oldOps.push(...startQuoteBlock.toOp(true))
          } else {
            startQuoteBlock = new QuoteBlock()
            this.doc.addBefore(startQuoteBlock, blocks[0])
          }
          for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
            const element = blocks[blocksIndex]
            oldOps.push(...element.toOp(true))
            const frames = element.getAllLayoutFrames()
            if (frames.length) {
              startQuoteBlock.addAll(frames)
              this.doc.remove(element)
            }
          }
          if (startQuoteBlock.nextSibling instanceof QuoteBlock) {
            oldOps.push(...startQuoteBlock.nextSibling.toOp(true))
            const frames = startQuoteBlock.nextSibling.removeAll()
            startQuoteBlock.addAll(frames)
            this.doc.remove(startQuoteBlock.nextSibling)
          }
          startQuoteBlock.needLayout = true

          let startIndex = 0
          let startPositionY = 0
          if (startQuoteBlock.prevSibling) {
            startIndex = startQuoteBlock.prevSibling.start + startQuoteBlock.prevSibling.length
            startPositionY = startQuoteBlock.prevSibling.y + startQuoteBlock.prevSibling.height
          }

          startQuoteBlock.setStart(startIndex, true, true, true)
          startQuoteBlock.setPositionY(startPositionY, false, true)

          const diff = new Delta(oldOps).diff(new Delta(startQuoteBlock.toOp(true)))
          const res = new Delta()
          if (startQuoteBlock.start > 0) {
            res.retain(startQuoteBlock.start)
          }
          diffDelta = res.concat(diff)
        }
        if (diffDelta) {
          this.pushDelta(diffDelta)
        }
      })
    }
  }

  /**
   * 设置列表
   */
  public setList(listType: EnumListType, range?: IRangeNew[]) {
    const targetRange = range || this.selector.getSelection()
    const affectedListId = new Set<number>()

    targetRange.forEach((r) => {
      const blocks: Block[] = this.getBlocksInRange(r)
      if (blocks.length <= 0) {
        return new Delta()
      }
      let startIndex = 0
      let startPositionY = 0
      if (blocks[0].prevSibling) {
        startIndex = blocks[0].prevSibling.start + blocks[0].prevSibling.length
        startPositionY = blocks[0].prevSibling.y + blocks[0].prevSibling.height
      }
      let startListItem: ListItem

      const newListId = increaseId()
      const oldOps: Op[] = []
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const block = blocks[blockIndex]
        oldOps.push(...block.toOp(true))
        if (block instanceof ListItem) {
          // 如果本身就是 listitem 就直接改 listType，并且统一 listId
          affectedListId.add(block.attributes.listId)
          block.format({
            listType,
            listId: newListId,
          })
          block.needLayout = true
          if (blockIndex === 0) {
            startListItem = block
          }
        } else {
          // 如果本身不是 listitem，就把他的每一个 frame 拆出来构建一个 listitem
          const frames = block.getAllLayoutFrames()
          for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
            const frame = frames[frameIndex]
            const listItemOriginAttributes: any = {}
            switch (listType) {
              case EnumListType.ol1:
                listItemOriginAttributes['list-type'] = 'decimal'
              // fall through
              case EnumListType.ol2:
                listItemOriginAttributes['list-type'] = 'ckj-decimal'
              // fall through
              case EnumListType.ol3:
                listItemOriginAttributes['list-type'] = 'upper-decimal'
                listItemOriginAttributes.listId = newListId
                break
              case EnumListType.ul1:
                listItemOriginAttributes['list-type'] = 'decimal'
              // fall through
              case EnumListType.ul2:
                listItemOriginAttributes['list-type'] = 'ring'
              // fall through
              case EnumListType.ul3:
                listItemOriginAttributes['list-type'] = 'arrow'
                listItemOriginAttributes.listId = newListId
                break
              default:
                listItemOriginAttributes['list-type'] = 'decimal'
                listItemOriginAttributes.listId = newListId
                break
            }
            const newListItem = new ListItem()
            newListItem.addAll([frame])
            newListItem.setAttributes(listItemOriginAttributes)
            this.doc.addBefore(newListItem, block)
            if (blockIndex === 0 && frameIndex === 0) {
              startListItem = newListItem
            }
          }
          this.doc.remove(block)
        }
      }

      startListItem!.setStart(startIndex, true, true, true)
      startListItem!.setPositionY(startPositionY, false, true)

      const newBlocks = this.getBlocksInRange(r)
      const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

      const diff = new Delta(oldOps).diff(new Delta(newOps))
      const res = new Delta()
      if (startListItem!.start > 0) {
        res.retain(startListItem!.start)
      }
      this.pushDelta(res.concat(diff))
    })
  }

  /**
   * 设置普通段落
   */
  public setParagraph(range?: IRangeNew[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      let finalDelta = new Delta()
      selection.forEach((r) => {
        const blocks = this.getBlocksInRange(r)
        if (blocks.length <= 0) {
          return
        }

        let startIndex = 0
        let startPositionY = 0
        if (blocks[0].prevSibling) {
          startIndex = blocks[0].prevSibling.start + blocks[0].prevSibling.length
          startPositionY = blocks[0].prevSibling.y + blocks[0].prevSibling.height
        }
        let startParagraph: Paragraph | null = null
        let lastParagraph: Paragraph | null = null
        const oldOps: Op[] = []
        for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
          oldOps.push(...blocks[blocksIndex].toOp(true))
          const frames = blocks[blocksIndex].getAllLayoutFrames()
          for (let framesIndex = 0; framesIndex < frames.length; framesIndex++) {
            const frame = frames[framesIndex]
            const newParagraph = new Paragraph()
            newParagraph.add(frame)
            this.doc.addBefore(newParagraph, blocks[blocksIndex])
            lastParagraph = newParagraph
            if (blocksIndex === 0 && framesIndex === 0) {
              startParagraph = newParagraph
            }
          }
          this.doc.remove(blocks[blocksIndex])
        }
        if (startParagraph && lastParagraph) {
          startParagraph.setStart(startIndex, true, true, true)
          startParagraph.setPositionY(startPositionY, false, true)

          const newBlocks = this.getBlocksInRange(r)
          const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

          const diff = new Delta(oldOps).diff(new Delta(newOps))
          const res = new Delta()
          if (newBlocks[0].start > 0) {
            res.retain(newBlocks[0].start)
          }
          const resDelta = res.concat(diff)
          finalDelta = finalDelta.compose(resDelta)
        }
      })
      this.pushDelta(finalDelta)
    }
  }

  public applyChanges(delta: Delta) {
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
              this.applyBat(currentBat)
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
      this.applyBat(currentBat)
    }

    // 最后触发重绘
    this.doc.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
  }

  private pushDelta(diff: Delta) {
    if (diff.ops.length > 0) {
      this.stack.pushDiff(diff)
    }
  }

  private getBlocksInRange(range: IRangeNew): Block[] {
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

  // 记录当前的 block
  // 如果是 retain 数字，看当前 block 是否发生变化，没有变化就继续，有变化就处理前一批
  // 如果是 retain delta，追加操作到当前批
  // 如果是 insert，追加操作到当前批
  // 如果是 delete, 追加操作到当前批且更新当前 block

  private applyBat(data: { startIndex: number; endIndex: number; ops: Op[] }) {
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

    // 把所有受影响的 list item 标记为需要 layout
    this.doc.markListItemToLayout(affectedListId)

    // 还要对选区进行 transform
    this.selector.applyChanges(opDelta)
  }
}
