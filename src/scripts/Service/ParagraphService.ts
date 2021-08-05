import Delta from 'quill-delta-enhanced'
import type Op from 'quill-delta-enhanced/dist/Op'
import type IRangeNew from '../Common/IRangeNew'
import type Document from '../DocStructure/Document'
import Paragraph from '../DocStructure/Paragraph'
import type ContentService from './ContentService'
import type { HistoryStackService } from './HistoryStackService'
import Service from './Service'

export default class QuoteBlockService extends Service {
  private stack: HistoryStackService
  private contentService: ContentService

  constructor(doc: Document, stack: HistoryStackService, contentService: ContentService) {
    super(doc)
    this.stack = stack
    this.contentService = contentService
  }

  /**
   * 设置普通段落
   */
  public setParagraph(range: IRangeNew[]) {
    let finalDelta = new Delta()
    range.forEach((r) => {
      const blocks = this.contentService.getBlocksInRange(r)
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

        const newBlocks = this.contentService.getBlocksInRange(r)
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
    if (finalDelta.ops.length > 0) {
      this.stack.pushDiff(finalDelta)
    }
  }
}
