import bounds from 'binary-search-bounds'
import Document from '../DocStructure/Document'
import { DocPos } from '../Common/DocPos'
import { getRelativeDocPos, compareDocPos, findRectChildInPosY, hasIntersection, cloneDocPos } from '../Common/util'
import Block from '../DocStructure/Block'
import IRectangle from '../Common/IRectangle'
import ICanvasContext from '../Common/ICanvasContext'
import EventEmitter from 'eventemitter3'
import { EventName } from '../Common/EnumEventName'

export default class SelectionController {
  public em = new EventEmitter()
  private doc: Document
  private selection: Array<{
    start: DocPos,
    end: DocPos,
  }> = []
  private selecting = false
  private selectionStartTemp: DocPos | null = null;
  private selectionEndTemp: DocPos | null = null;
  private selectionStart: DocPos | null = null;
  private selectionEnd: DocPos | null = null;

  constructor(doc: Document) {
    this.doc = doc
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_LAYOUT, this.onDocumentLayout)
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_DRAW, this.onDocumentFastDraw)
  }

  public getSelection() {
    return this.selection
  }

  public startSelection(x: number, y: number) {
    const docPos = this.doc.getDocumentPos(x, y, true)
    if (docPos) {
      this.selecting = true
      this.selectionStartTemp = docPos
      this.selectionEndTemp = this.selectionStartTemp
    }
  }

  public updateSelection(x: number, y: number) {
    if (this.selecting) {
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      this.calSelection()
      this.em.emit(EventName.CHANGE_SELECTION)
    }
  }

  public endSelection(x: number, y: number) {
    if (this.selecting) {
      this.selecting = false
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      this.calSelection()
      this.em.emit(EventName.CHANGE_SELECTION)
    }
  }

  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    // 先计算出可视区域有哪些 block，再看这些 block 是否在选区范围内，如果在就计算选区矩形区域，就绘制
    if (
      this.selection.length === 0 ||
      (
        this.selection.length === 1 &&
        compareDocPos(this.selection[0].start, this.selection[0].end) === 0
      )
    ) return
    const startBlock = findRectChildInPosY(scrollTop, this.doc.children)
    const endBlock = findRectChildInPosY(scrollTop + viewHeight, this.doc.children)
    if (startBlock && endBlock) {
      const selectionRectangles = this.getSelectionRectangles(this.selection, startBlock, endBlock)
      if (selectionRectangles.length > 0) {
        ctx.drawSelectionArea(selectionRectangles, scrollTop, scrollTop + viewHeight, 0)
      }
    }
  }

  public getSelectionRectangles(
    selections: Array<{
      start: DocPos,
      end: DocPos,
    }>,
    startBlock?: Block,
    endBlock?: Block
  ): IRectangle[] {
    startBlock = startBlock || this.doc.head || undefined
    endBlock = endBlock || this.doc.tail || undefined
    if (!startBlock || !endBlock) return []
    const selectionRectangles: IRectangle[] = []
    for (let index = 0; index < selections.length; index++) {
      const selection = selections[index]
      const startRetain = selection.start.index
      const endRetain = selection.end.index
      if (hasIntersection(startBlock.start, endBlock.start + endBlock.length, startRetain, endRetain)) {
        let currentBlock: Block | null = startBlock
        while (currentBlock) {
          if (hasIntersection(currentBlock.start, currentBlock.start + currentBlock.length, startRetain, endRetain + 1)) {
            selectionRectangles.push(...currentBlock.getSelectionRectangles(
              getRelativeDocPos(currentBlock.start, selection.start),
              getRelativeDocPos(currentBlock.start, selection.end),
            ))
          }
          if (currentBlock !== endBlock) {
            currentBlock = currentBlock.nextSibling
          } else {
            currentBlock = null
          }
        }
      }
    }
    return selectionRectangles
  }

  private onDocumentLayout = ({ ctx, scrollTop, viewHeight }: { ctx: ICanvasContext, scrollTop: number, viewHeight: number }) => {
    this.draw(ctx, scrollTop, viewHeight)
  }

  private onDocumentFastDraw = ({ ctx, scrollTop, viewHeight }: { ctx: ICanvasContext, scrollTop: number, viewHeight: number }) => {
    this.draw(ctx, scrollTop, viewHeight)
  }

  /**
   * 对选区的端点进行排序，使靠前的点始终在 start 靠后的点始终在 end
   */
  private orderSelectionPoint() {
    if (!this.selectionStartTemp || !this.selectionEndTemp) return
    if (compareDocPos(this.selectionStartTemp, this.selectionEndTemp) === 1) {
      this.selectionStart = this.selectionEndTemp
      this.selectionEnd = this.selectionStartTemp
    } else {
      this.selectionStart = this.selectionStartTemp
      this.selectionEnd = this.selectionEndTemp
    }
  }

  /**
   * 计算实际的选区范围
   */
  private calSelection() {
    if (!this.selectionStart || !this.selectionEnd) return
    // 先查找 selectionStart 在哪个 block 内
    const firstPosStart = this.selectionStart.index
    const fakeTargetStart = {
      start: firstPosStart,
    }
    const startBlockIndex = bounds.le(this.doc.children, fakeTargetStart, (a, b) => {
      return a.start - b.start
    })
    // 再查找 selectionEnd 在哪个 block 内
    const firstPosEnd = this.selectionEnd.index
    const fakeTargetEnd = {
      start: firstPosEnd,
    }
    const endBlockIndex = bounds.le(this.doc.children, fakeTargetEnd, (a, b) => {
      return a.start - b.start
    })
    // 再开始计算实际选区
    if (startBlockIndex === endBlockIndex) {
      // 如果开始位置和结束位置落在同一个 block 中
      const targetBlock = this.doc.children[startBlockIndex]
      if (targetBlock.needCorrectSelectionPos) {
        const targetBlockStart = getRelativeDocPos(targetBlock.start, this.selectionStart)
        const targetBlockEnd = getRelativeDocPos(targetBlock.start, this.selectionEnd)
        const childrenSelection = targetBlock.correctSelectionPos(targetBlockStart, targetBlockEnd)
        this.selection = childrenSelection.map(selection => {
          const start = cloneDocPos(selection.start) as DocPos
          const end = cloneDocPos(selection.end) as DocPos
          if (start) {
            start.index += targetBlock.start
          }
          if (end) {
            end.index += targetBlock.start
          }
          return { start, end }
        })
      } else {
        this.selection = [{
          start: this.selectionStart,
          end: this.selectionEnd,
        }]
      }
    } else {
      let finalStart: DocPos
      let finalEnd: DocPos
      // 如果开始位置和结束位置落在不同的 block 中，分别计算最终的计算开始位置和结束位置
      const startTargetBlock = this.doc.children[startBlockIndex]
      if (startTargetBlock.needCorrectSelectionPos) {
        const targetBlockStart = getRelativeDocPos(startTargetBlock.start, this.selectionStart)
        finalStart = startTargetBlock.correctSelectionPos(targetBlockStart, null)[0].start as DocPos
        finalStart.index += startTargetBlock.start
      } else {
        finalStart = this.selectionStart
      }

      const endTargetBlock = this.doc.children[endBlockIndex]
      if (endTargetBlock.needCorrectSelectionPos) {
        const targetBlockEnd = getRelativeDocPos(endTargetBlock.start, this.selectionEnd)
        finalEnd = endTargetBlock.correctSelectionPos(null, targetBlockEnd)[0].end as DocPos
        finalEnd.index += endTargetBlock.start
      } else {
        finalEnd = this.selectionEnd
      }

      this.selection = [
        {
          start: finalStart,
          end: finalEnd,
        },
      ]
    }
  }
}
