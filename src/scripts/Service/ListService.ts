import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import IRangeNew from '../Common/IRangeNew'
import { increaseId } from '../Common/util'
import Block from '../DocStructure/Block'
import Document from '../DocStructure/Document'
import { EnumListType } from '../DocStructure/EnumListStyle'
import ListItem from '../DocStructure/ListItem'
import ContentService from './ContentService'
import { HistoryStackService } from './HistoryStackService'
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
   * 设置列表
   */
  public setList(listType: EnumListType, range: IRangeNew[]) {
    const targetRange = range
    const affectedListId = new Set<number>()
    let finalDelta = new Delta()
    targetRange.forEach((r) => {
      const blocks: Block[] = this.contentService.getBlocksInRange(r)
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

      const newBlocks = this.contentService.getBlocksInRange(r)
      const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

      const diff = new Delta(oldOps).diff(new Delta(newOps))
      const res = new Delta()
      if (startListItem!.start > 0) {
        res.retain(startListItem!.start)
      }
      finalDelta = finalDelta.compose(res.concat(diff))
    })
    if (finalDelta.ops.length > 0) {
      this.stack.pushDiff(finalDelta)
    }
  }
}
