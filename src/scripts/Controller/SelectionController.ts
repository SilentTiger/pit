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
import ICoordinatePos from '../Common/ICoordinatePos'

export enum EnumSelectionSource {
  Empty,
  Mouse,
  Keyboard,
}

export default class SelectionController {
  public em = new EventEmitter()
  private doc: Document
  private selection: IRangeNew[] = []
  private lastSelection: IRangeNew[] = []
  private selectionSource: EnumSelectionSource = EnumSelectionSource.Empty
  private mouseSelecting = false // 用鼠标创建选区的过程中
  private keyboardSelecting = false // 用键盘操作创建选区的过程中
  private keyboardSelectStartPos: { start: ICoordinatePos; end: ICoordinatePos } | null = null
  private selectionStartTemp: DocPos | null = null
  private selectionEndTemp: DocPos | null = null
  private selectionStart: DocPos | null = null
  private selectionEnd: DocPos | null = null
  private cursorPosLimitationY: number | null = null

  constructor(doc: Document) {
    this.doc = doc
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_LAYOUT, this.onDocumentLayout)
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_DRAW, this.onDocumentFastDraw)
  }

  public getSelection() {
    return this.selection
  }

  public setSelection(ranges: IRangeNew[], source?: EnumSelectionSource) {
    this.changeSelectionSource(ranges.length > 0 ? source ?? this.selectionSource : EnumSelectionSource.Empty)
    this.selection = ranges
    this.lastSelection = ranges
    this.em.emit(EventName.CHANGE_SELECTION, this.selection)
  }

  public clearSelection(): IRangeNew[] {
    this.selection = []
    this.em.emit(EventName.CHANGE_SELECTION, this.selection)
    return this.lastSelection
  }

  /**
   * 恢复选区，一般用在编辑器简历选区后失焦然后又重新获得焦点时
   */
  public restoreSelection() {
    this.setSelection(this.lastSelection)
  }

  public changeSelectionSource(source: EnumSelectionSource) {
    this.selectionSource = source
  }

  public startMouseSelection(x: number, y: number) {
    const docPos = this.doc.getDocumentPos(x, y, true)
    if (docPos) {
      this.changeSelectionSource(EnumSelectionSource.Mouse)
      this.mouseSelecting = true
      this.selectionStartTemp = docPos
      this.selectionEndTemp = this.selectionStartTemp
    }
  }

  public updateMouseSelection(x: number, y: number) {
    if (this.mouseSelecting) {
      this.changeSelectionSource(EnumSelectionSource.Mouse)
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      const selection = this.calSelection()
      if (selection) {
        this.setSelection(selection, EnumSelectionSource.Mouse)
      }
    }
  }

  public endMouseSelection(x: number, y: number) {
    if (this.mouseSelecting) {
      this.changeSelectionSource(EnumSelectionSource.Mouse)
      this.mouseSelecting = false
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      const selection = this.calSelection()
      if (selection) {
        this.cursorPosLimitationY = y
        this.setSelection(selection, EnumSelectionSource.Mouse)
      }
    }
  }

  public updateKeyboardSelection() {}

  public getSelectionRectangles(): IRectangle[] {
    const rects = this.calSelectionRectangles(this.selection)
    if (this.selectionSource === EnumSelectionSource.Mouse) {
      return rects.filter((rect) => {
        return hasIntersection(
          rect.y,
          rect.y + rect.height,
          this.cursorPosLimitationY ?? -1,
          this.cursorPosLimitationY ?? -1,
        )
      })
    } else {
      return rects
    }
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
    if (this.selection.length > 0) {
      this.startKeyboardSelection()
      const currentPos = this.selection[0].start
      const newPos = this.doc.prevLinePos(currentPos, this.keyboardSelectStartPos!.start.x) ?? currentPos
      this.setSelection(
        [
          {
            start: newPos,
            end: newPos,
          },
        ],
        EnumSelectionSource.Keyboard,
      )
    }
  }
  public cursorMoveDown() {
    if (this.selection.length > 0) {
      this.startKeyboardSelection()
      const currentPos = this.selection[this.selection.length - 1].end
      const pos = this.calSelectionRectangles([{ start: currentPos, end: currentPos }])[0]
      const newPos = this.doc.nextLinePos(currentPos, pos.x) ?? currentPos
      this.setSelection(
        [
          {
            start: newPos,
            end: newPos,
          },
        ],
        EnumSelectionSource.Keyboard,
      )
    }
  }
  public cursorMoveLeft() {
    if (this.selection.length > 0) {
      this.startKeyboardSelection()
      const currentPos = this.selection[0].start
      const newPos = this.doc.prevPos(currentPos) ?? currentPos
      this.setSelection(
        [
          {
            start: newPos,
            end: newPos,
          },
        ],
        EnumSelectionSource.Keyboard,
      )
    }
  }
  public cursorMoveRight() {
    if (this.selection.length > 0) {
      this.startKeyboardSelection()
      const currentPos = this.selection[this.selection.length - 1].end
      const newPos = this.doc.nextPos(currentPos) ?? currentPos
      this.setSelection(
        [
          {
            start: newPos,
            end: newPos,
          },
        ],
        EnumSelectionSource.Keyboard,
      )
    }
  }
  public cursorMoveToLineStart() {
    if (this.selection.length > 0) {
      this.startKeyboardSelection()
      const currentPos = this.selection[0].start
      const newPos = this.doc.lineStartPos(currentPos, this.keyboardSelectStartPos!.start.y) ?? currentPos
      this.setSelection(
        [
          {
            start: newPos,
            end: newPos,
          },
        ],
        EnumSelectionSource.Keyboard,
      )
    }
  }
  public cursorMoveToLineEnd() {
    if (this.selection.length > 0) {
      this.startKeyboardSelection()
      const currentPos = this.selection[this.selection.length - 1].end
      const newPos = this.doc.lineEndPos(currentPos, this.keyboardSelectStartPos!.end.y) ?? currentPos
      this.setSelection(
        [
          {
            start: newPos,
            end: newPos,
          },
        ],
        EnumSelectionSource.Keyboard,
      )
    }
  }

  private startKeyboardSelection() {
    if (this.selectionSource !== EnumSelectionSource.Keyboard) {
      const rects = this.getSelectionRectangles()
      if (rects.length > 0) {
        const { x: startX, y: startY } = rects[0]
        const { x: endX, y: endY } = rects[rects.length - 1]
        this.keyboardSelectStartPos = {
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
        }
      }
    }
  }

  private calSelectionRectangles(
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
    console.log('length', selectionRectangles.length)
    return selectionRectangles
  }

  private draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
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
      const selectionRectangles = this.calSelectionRectangles(this.selection, startBlock, endBlock)
      if (selectionRectangles.length > 0) {
        ctx.drawSelectionArea(selectionRectangles, scrollTop, scrollTop + viewHeight, 0)
      }
    }
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
