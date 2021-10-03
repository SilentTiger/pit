import Delta from 'quill-delta-enhanced'
import type Op from 'quill-delta-enhanced/dist/Op'
import type IRange from '../Common/IRange'
import type Block from '../DocStructure/Block'
import type Document from '../Document/Document'
import QuoteBlock from '../DocStructure/QuoteBlock'
import type ContentService from './ContentService'
import type { HistoryStackService } from './HistoryStackService'
import type ParagraphService from './ParagraphService'
import Service from './Service'

export default class QuoteBlockService extends Service {
  private stack: HistoryStackService
  private contentService: ContentService
  private paragraphService: ParagraphService

  constructor(
    doc: Document,
    stack: HistoryStackService,
    contentService: ContentService,
    paragraphService: ParagraphService,
  ) {
    super(doc)
    this.stack = stack
    this.contentService = contentService
    this.paragraphService = paragraphService
  }

  /**
   * 设置引用块
   */
  public setQuoteBlock(range: IRange[]) {
    let diffDelta: Delta = new Delta()
    range.forEach((r) => {
      const blocks: Block[] = this.contentService.getBlocksInRange(r)

      const quoteBlocks = blocks.filter((blk: Block) => blk instanceof QuoteBlock)
      if (quoteBlocks.length === blocks.length) {
        // 如果所有的 block 都是 quoteblock 就取消所有的 quoteblock
        this.paragraphService.setParagraph(range)
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
        diffDelta = diffDelta.compose(res.concat(diff))
      }
    })
    if (diffDelta?.ops.length) {
      this.stack.pushDiff(diffDelta)
    }
  }
}
