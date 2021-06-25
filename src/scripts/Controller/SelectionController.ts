import bounds from 'binary-search-bounds'
import Document from '../DocStructure/Document'
import { DocPos } from '../Common/DocPos'
import {
  getRelativeDocPos,
  compareDocPos,
  findRectChildInPosY,
  hasIntersection,
  cloneDocPos,
  transformDocPos,
} from '../Common/util'
import Block from '../DocStructure/Block'
import IRectangle from '../Common/IRectangle'
import ICanvasContext from '../Common/ICanvasContext'
import EventEmitter from 'eventemitter3'
import { EventName } from '../Common/EnumEventName'
import IRangeNew from '../Common/IRangeNew'
import Delta from 'quill-delta-enhanced'

export default class SelectionController {
  public em = new EventEmitter()
  private doc: Document
  private selection: IRangeNew[] = []
  private mouseSelecting = false // 用鼠标创建选区的过程中
  private keyboardSelecting = false // 用键盘操作创建选区的过程中
  private selectionStartTemp: DocPos | null = null
  private selectionEndTemp: DocPos | null = null
  private selectionStart: DocPos | null = null
  private selectionEnd: DocPos | null = null

  constructor(doc: Document) {
    this.doc = doc
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_LAYOUT, this.onDocumentLayout)
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_DRAW, this.onDocumentFastDraw)
  }

  public getSelection() {
    return this.selection
  }

  public setSelection(ranges: IRangeNew[]) {
    this.selection = ranges
    this.em.emit(EventName.CHANGE_SELECTION, this.selection)
  }

  public startMouseSelection(x: number, y: number) {
    const docPos = this.doc.getDocumentPos(x, y, true)
    if (docPos) {
      this.mouseSelecting = true
      this.selectionStartTemp = docPos
      this.selectionEndTemp = this.selectionStartTemp
    }
  }

  public updateMouseSelection(x: number, y: number) {
    if (this.mouseSelecting) {
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      const selection = this.calSelection()
      if (selection) {
        this.setSelection(selection)
      }
    }
  }

  public endMouseSelection(x: number, y: number) {
    if (this.mouseSelecting) {
      this.mouseSelecting = false
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      const selection = this.calSelection()
      if (selection) {
        this.setSelection(selection)
      }
    }
  }

  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    // 先计算出可视区域有哪些 block，再看这些 block 是否在选区范围内，如果在就计算选区矩形区域，就绘制
    if (
      this.selection.length === 0 ||
      (this.selection.length === 1 && compareDocPos(this.selection[0].start, this.selection[0].end) === 0)
    ) {
      return
    }
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
      start: DocPos
      end: DocPos
    }>,
    startBlock?: Block,
    endBlock?: Block,
  ): IRectangle[] {
    const targetStartBlock = startBlock || this.doc.head || undefined
    const targetEndBlock = endBlock || this.doc.tail || undefined
    if (!targetStartBlock || !targetEndBlock) {
      return []
    }
    const selectionRectangles: IRectangle[] = []
    for (let index = 0; index < selections.length; index++) {
      const selection = selections[index]
      const startRetain = selection.start.index
      const endRetain = selection.end.index
      if (
        hasIntersection(targetStartBlock.start, targetEndBlock.start + targetEndBlock.length, startRetain, endRetain)
      ) {
        let currentBlock: Block | null = targetStartBlock
        while (currentBlock) {
          if (
            hasIntersection(currentBlock.start, currentBlock.start + currentBlock.length, startRetain, endRetain + 1)
          ) {
            selectionRectangles.push(
              ...currentBlock.getSelectionRectangles(
                getRelativeDocPos(currentBlock.start, selection.start),
                getRelativeDocPos(currentBlock.start, selection.end),
              ),
            )
          }
          if (currentBlock !== targetEndBlock) {
            currentBlock = currentBlock.nextSibling
          } else {
            currentBlock = null
          }
        }
      }
    }
    return selectionRectangles
  }

  public applyChanges(delta: Delta) {
    // 先把当前的选区转成 delta，然后 transform，再把处理好的 delta 转成选区
    if (this.selection.length > 0) {
      const newSelection = this.selection.map((range) => {
        const newPosStart = transformDocPos(range.start, delta)
        const newPosEnd = transformDocPos(range.end, delta)
        return {
          start: newPosStart,
          end: newPosEnd,
        }
      })
      this.setSelection(newSelection)
    }
  }

  public cursorMoveUp() {
    const selectionRanges: IRangeNew[] = []
    for (let index = this.selection.length - 1; index >= 0; index--) {
      const currentPos = this.selection[index].end
      const pos = this.getSelectionRectangles([{ start: currentPos, end: currentPos }])[0]
      const newPos = this.doc.prevLinePos(currentPos, pos.x, pos.y) ?? currentPos
      selectionRanges.push({
        start: newPos,
        end: newPos,
      })
    }
    const distinctRanges = this.distinctRanges(selectionRanges)
    this.setSelection(distinctRanges)
  }
  public cursorMoveDown() {
    const selectionRanges: IRangeNew[] = []
    for (let index = this.selection.length - 1; index >= 0; index--) {
      const currentPos = this.selection[index].end
      const pos = this.getSelectionRectangles([{ start: currentPos, end: currentPos }])[0]
      const newPos = this.doc.nextLinePos(currentPos, pos.x, pos.y + pos.height) ?? currentPos
      selectionRanges.push({
        start: newPos,
        end: newPos,
      })
    }
    const distinctRanges = this.distinctRanges(selectionRanges)
    this.setSelection(distinctRanges)
  }
  public cursorMoveLeft() {
    const selectionRanges: IRangeNew[] = []
    for (let index = this.selection.length - 1; index >= 0; index--) {
      const currentPos = this.selection[index].start
      const newPos = this.doc.prevPos(currentPos) ?? currentPos
      selectionRanges.push({
        start: newPos,
        end: newPos,
      })
    }
    const distinctRanges = this.distinctRanges(selectionRanges)
    this.setSelection(distinctRanges)
  }
  public cursorMoveRight() {
    const selectionRanges: IRangeNew[] = []
    for (let index = this.selection.length - 1; index >= 0; index--) {
      const currentPos = this.selection[index].end
      const newPos = this.doc.nextPos(currentPos) ?? currentPos
      selectionRanges.push({
        start: newPos,
        end: newPos,
      })
    }
    const distinctRanges = this.distinctRanges(selectionRanges)
    this.setSelection(distinctRanges)
  }
  public cursorMoveToLineStart() {
    const selectionRanges: IRangeNew[] = []
    for (let index = this.selection.length - 1; index >= 0; index--) {
      const currentPos = this.selection[index].start
      const pos = this.getSelectionRectangles([{ start: currentPos, end: currentPos }])[0]
      const newPos = this.doc.lineStartPos(currentPos, pos.y) ?? currentPos
      selectionRanges.push({
        start: newPos,
        end: newPos,
      })
    }
    const distinctRanges = this.distinctRanges(selectionRanges)
    this.setSelection(distinctRanges)
  }
  public cursorMoveToLineEnd() {
    const selectionRanges: IRangeNew[] = []
    for (let index = this.selection.length - 1; index >= 0; index--) {
      const currentPos = this.selection[index].end
      const pos = this.getSelectionRectangles([{ start: currentPos, end: currentPos }])[0]
      const newPos = this.doc.lineStartPos(currentPos, pos.y) ?? currentPos
      selectionRanges.push({
        start: newPos,
        end: newPos,
      })
    }
    const distinctRanges = this.distinctRanges(selectionRanges)
    this.setSelection(distinctRanges)
  }

  private onDocumentLayout = ({
    ctx,
    scrollTop,
    viewHeight,
  }: {
    ctx: ICanvasContext
    scrollTop: number
    viewHeight: number
  }) => {
    this.draw(ctx, scrollTop, viewHeight)
  }

  private onDocumentFastDraw = ({
    ctx,
    scrollTop,
    viewHeight,
  }: {
    ctx: ICanvasContext
    scrollTop: number
    viewHeight: number
  }) => {
    this.draw(ctx, scrollTop, viewHeight)
  }

  /**
   * 对选区的端点进行排序，使靠前的点始终在 start 靠后的点始终在 end
   */
  private orderSelectionPoint() {
    if (!this.selectionStartTemp || !this.selectionEndTemp) {
      return
    }
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
  private calSelection(): IRangeNew[] | null {
    if (!this.selectionStart || !this.selectionEnd) {
      return null
    }
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
      const targetBlockStart = getRelativeDocPos(targetBlock.start, this.selectionStart)
      const targetBlockEnd = getRelativeDocPos(targetBlock.start, this.selectionEnd)
      const childrenSelection = targetBlock.correctSelectionPos(targetBlockStart, targetBlockEnd)
      return childrenSelection.map((selection) => {
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
      // 如果开始位置和结束位置落在不同的 block 中，分别计算最终的计算开始位置和结束位置
      const startTargetBlock = this.doc.children[startBlockIndex]
      const targetBlockStart = getRelativeDocPos(startTargetBlock.start, this.selectionStart)
      const finalStart = startTargetBlock.correctSelectionPos(targetBlockStart, null)[0].start as DocPos
      finalStart.index += startTargetBlock.start

      const endTargetBlock = this.doc.children[endBlockIndex]
      const targetBlockEnd = getRelativeDocPos(endTargetBlock.start, this.selectionEnd)
      const finalEnd = endTargetBlock.correctSelectionPos(null, targetBlockEnd)[0].end as DocPos
      finalEnd.index += endTargetBlock.start

      return [
        {
          start: finalStart,
          end: finalEnd,
        },
      ]
    }
  }

  /**
   * 去掉重复的 range
   */
  private distinctRanges(ranges: IRangeNew[]): IRangeNew[] {
    // 对所有的 range 按先 start 后 end 的顺序排序
    // 然后遍历一遍去掉重复的
    const res = ranges.sort((a, b) => {
      const startCompareRes = compareDocPos(a.start, b.start)
      if (startCompareRes === 0) {
        return compareDocPos(a.end, b.end)
      } else {
        return startCompareRes
      }
    })
    for (let index = res.length - 1; index > 0; index--) {
      const current = res[index]
      const prev = res[index - 1]
      if (compareDocPos(current.start, prev.start) === 0 && compareDocPos(current.end, prev.end) === 0) {
        res.splice(index, 1)
      }
    }
    return res
  }
}
