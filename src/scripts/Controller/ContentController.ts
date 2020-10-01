import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import Document from '../DocStructure/Document'
import IRangeNew from '../Common/IRangeNew'
import Block from '../DocStructure/Block'
import Paragraph from '../DocStructure/Paragraph'
import QuoteBlock from '../DocStructure/QuoteBlock'
import { compareDocPos, findChildInDocPos } from '../Common/util'
import BlockCommon from '../DocStructure/BlockCommon'
import { HistoryStackController } from './HistoryStackController'
import SelectionController from './SelectionController'
import { moveRight } from '../Common/DocPos'
import { IFragmentOverwriteAttributes } from '../DocStructure/FragmentOverwriteAttributes'
import { EnumListType } from '../DocStructure/EnumListStyle'

export default class ContentController {
  private delta: Delta | null = null
  private doc: Document
  private stack: HistoryStackController
  private selector: SelectionController

  constructor(doc: Document, stack: HistoryStackController, selector: SelectionController) {
    this.doc = doc
    this.stack = stack
    this.selector = selector
  }

  public setInitDelta(delta: Delta) {
    this.delta = delta
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

  public delete(forward: boolean, range?: IRangeNew[]) {
    const selection = range || this.selector.getSelection()
    if (selection && selection.length > 0) {
      let finalDelta = new Delta()
      for (let index = selection.length - 1; index >= 0; index--) {
        const range = selection[index]
        if (compareDocPos(range.start, range.end) !== 0) {
          const diff = this.doc.delete([range], forward)
          finalDelta = finalDelta.compose(diff)
        }
      }

      this.pushDelta(finalDelta)
      const newPos = selection[0].start
      this.selector.setSelection([{ start: newPos, end: newPos }])
    }
  }

  public startComposition() { /* todo */ }
  public updateComposition() { /* todo */ }
  public endComposition() { /* todo */ }

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
      selection.forEach(r => {
        if (compareDocPos(r.start, r.end) === 0) {
          // 如果没有选区就先插入一段文本
          this.doc.insertText(url, r.start, false)
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
    selection.forEach(r => {
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
      if (blockCommons.length <= 0) { return new Delta() }
      const oldOps: Op[] = []
      const newOps: Op[] = []
      for (let i = 0; i < blockCommons.length; i++) {
        const element = blockCommons[i]
        oldOps.push(...element.toOp())
        blockCommons[i].setIndent(increase)
        newOps.push(...element.toOp())
      }

      const diff = (new Delta(oldOps)).diff(new Delta(newOps))
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
      selection.forEach(r => {
        const startBlock = findChildInDocPos(r.start.index, this.doc.children, true)
        const endBlock = findChildInDocPos(r.start.index, this.doc.children, true)

        const blocks: Block[] = []
        let currentBlock = startBlock
        while (currentBlock) {
          blocks.push(currentBlock)
          if (currentBlock === endBlock) {
            break
          }
          currentBlock = currentBlock.nextSibling
        }

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
            oldOps.push(...startQuoteBlock.toOp())
          } else {
            startQuoteBlock = new QuoteBlock()
            this.doc.addBefore(startQuoteBlock, blocks[0])
          }
          for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
            const element = blocks[blocksIndex]
            oldOps.push(...element.toOp())
            const frames = element.getAllLayoutFrames()
            if (frames.length) {
              startQuoteBlock.addAll(frames)
              this.doc.remove(element)
            }
          }
          if (startQuoteBlock.nextSibling instanceof QuoteBlock) {
            oldOps.push(...startQuoteBlock.nextSibling.toOp())
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

          const diff = (new Delta(oldOps)).diff(new Delta(startQuoteBlock.toOp()))
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
  public setList(listType: EnumListType) {
    // todo
    // const selection = this.selector.getSelection()
    // if (selection) {
    //   const { index, length } = selection
    //   const affectedListId = new Set<number>()
    //   const blocks = this.doc.findBlocksByRange(index, length)
    //   if (blocks.length <= 0) { return new Delta() }
    //   let startIndex = 0
    //   let startPositionY = 0
    //   if (blocks[0].prevSibling) {
    //     startIndex = blocks[0].prevSibling.start + blocks[0].prevSibling.length
    //     startPositionY = blocks[0].prevSibling.y + blocks[0].prevSibling.height
    //   }
    //   let startListItem: ListItem

    //   const newListId = increaseId()
    //   const oldOps: Op[] = []
    //   for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    //     const block = blocks[blockIndex]
    //     oldOps.push(...block.toOp())
    //     if (block instanceof ListItem) {
    //       // 如果本身就是 listitem 就直接改 listType，并且统一 listId
    //       affectedListId.add(block.attributes.listId)
    //       block.format({
    //         listType,
    //         listId: newListId,
    //       }, 0, block.length)
    //       block.needLayout = true
    //       if (blockIndex === 0) {
    //         startListItem = block
    //       }
    //     } else {
    //       // 如果本身不是 listitem，就把他的每一个 frame 拆出来构建一个 listitem
    //       const frames = block.getAllLayoutFrames()
    //       for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    //         const frame = frames[frameIndex]
    //         const listItemOriginAttributes: any = {}
    //         switch (listType) {
    //           case EnumListType.ol1:
    //             listItemOriginAttributes['list-type'] = 'decimal'
    //           // break omitted
    //           case EnumListType.ol2:
    //             listItemOriginAttributes['list-type'] = 'ckj-decimal'
    //           // break omitted
    //           case EnumListType.ol3:
    //             listItemOriginAttributes['list-type'] = 'upper-decimal'
    //             listItemOriginAttributes['list-id'] = newListId
    //             break
    //           case EnumListType.ul1:
    //             listItemOriginAttributes['list-type'] = 'decimal'
    //           // break omitted
    //           case EnumListType.ul2:
    //             listItemOriginAttributes['list-type'] = 'ring'
    //           // break omitted
    //           case EnumListType.ul3:
    //             listItemOriginAttributes['list-type'] = 'arrow'
    //             listItemOriginAttributes['list-id'] = newListId
    //             break
    //           default:
    //             listItemOriginAttributes['list-type'] = 'decimal'
    //             listItemOriginAttributes['list-id'] = newListId
    //             break
    //         }
    //         const newListItem = new ListItem()
    //         newListItem.addAll([frame])
    //         newListItem.setAttributes(listItemOriginAttributes)
    //         this.doc.addBefore(newListItem, block)
    //         if (blockIndex === 0 && frameIndex === 0) {
    //           startListItem = newListItem
    //         }
    //       }
    //       this.doc.remove(block)
    //     }
    //   }

    //   startListItem!.setStart(startIndex, true, true, true)
    //   startListItem!.setPositionY(startPositionY, false, true)

    //   const newBlocks = this.doc.findBlocksByRange(index, length)
    //   const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

    //   const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    //   const res = new Delta()
    //   if (startListItem!.start > 0) {
    //     res.retain(startListItem!.start)
    //   }
    //   this.pushDelta(res.concat(diff))
    // }
  }

  /**
   * 设置普通段落
   */
  public setParagraph(range?: IRangeNew[]) {
    const selection = range || this.selector.getSelection()
    if (selection) {
      let finalDelta = new Delta()
      selection.forEach(r => {
        const blocks = this.doc.findBlocksByRange(r.start.index, r.start.index - r.end.index)
        if (blocks.length <= 0) { return }

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
          oldOps.push(...blocks[blocksIndex].toOp())
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

          const newBlocks = this.doc.findBlocksByRange(startParagraph.start, lastParagraph.start - startParagraph.start)
          const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

          const diff = (new Delta(oldOps)).diff(new Delta(newOps))
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

  private pushDelta(diff: Delta) {
    if (diff.ops.length > 0 && this.delta) {
      this.stack.push({
        redo: diff,
        undo: diff.invert(this.delta),
      })
      this.delta = this.delta.compose(diff)
    }
  }
}
