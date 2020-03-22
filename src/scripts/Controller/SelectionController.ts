import bounds from 'binary-search-bounds'
import Document from '../DocStructure/Document'
import IDocPos from '../Common/IDocPos'
import { getRelativeDocPos, mergeDocPos } from '../Common/util'

export default class SelectionController {
  private doc: Document
  private selection: Array<{
    start: { ops: IDocPos[] },
    end: { ops: IDocPos[] },
  }> = []
  private selecting = false
  private startX = 0
  private startY = 0
  private endX = 0
  private endY = 0
  private selectionStartTemp: { ops: IDocPos[] } | null = null;
  private selectionEndTemp: { ops: IDocPos[] } | null = null;
  private selectionStart: { ops: IDocPos[] } | null = null;
  private selectionEnd: { ops: IDocPos[] } | null = null;

  constructor(doc: Document) {
    this.doc = doc
  }

  public startSelection(x: number, y: number) {
    this.selecting = true
    this.selectionStartTemp = this.doc.getDocumentPos(x, y)
    this.selectionEndTemp = this.selectionStartTemp
  }

  public updateSelection(x: number, y: number) {
    if (this.selecting) {
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
    }
  }

  public endSelection(x: number, y: number) {
    if (this.selecting) {
      this.selecting = false
      this.selectionEndTemp = this.doc.getDocumentPos(x, y)
      this.orderSelectionPoint()
      this.calSelection()
    }
  }

  /**
   * 对选区的端点进行排序，使靠前的点始终在 start 靠后的点始终在 end
   */
  private orderSelectionPoint() {
    if (!this.selectionStartTemp || !this.selectionEndTemp) return
    if (this.compareDocPos(this.selectionStartTemp, this.selectionEndTemp)) {
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
    const firstPosStart = typeof this.selectionStart.ops[0].retain === 'number' ? this.selectionStart.ops[0].retain : 0
    const fakeTargetStart = {
      start: firstPosStart,
    }
    const startBlockIndex = bounds.le(this.doc.children, fakeTargetStart, (a, b) => {
      return a.start - b.start
    })
    // 再查找 selectionEnd 在哪个 block 内
    const firstPosEnd = typeof this.selectionEnd.ops[0].retain === 'number' ? this.selectionEnd.ops[0].retain : 0
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
          return {
            start: { ops: mergeDocPos(targetBlock.start, selection.start as { ops: IDocPos[] }) },
            end: { ops: mergeDocPos(targetBlock.start, selection.end as { ops: IDocPos[] }) },
          }
        })
      } else {
        this.selection = [{
          start: this.selectionStart,
          end: this.selectionEnd,
        }]
      }
    } else {
      let finalStart: {ops: IDocPos[]} = { ops: [] }
      let finalEnd: {ops: IDocPos[]} = { ops: [] }
      // 如果开始位置和结束位置落在不同的 block 中，分别计算最终的计算开始位置和结束位置
      const startTargetBlock = this.doc.children[startBlockIndex]
      if (startTargetBlock.needCorrectSelectionPos) {
        const targetBlockStart = getRelativeDocPos(startTargetBlock.start, this.selectionStart)
        const childrenSelection = startTargetBlock.correctSelectionPos(targetBlockStart, null)
        finalStart = { ops: mergeDocPos(startTargetBlock.start, childrenSelection[0].start as {ops: IDocPos[]}) }
      } else {
        finalStart = this.selectionStart
      }

      const endTargetBlock = this.doc.children[endBlockIndex]
      if (endTargetBlock.needCorrectSelectionPos) {
        const targetBlockEnd = getRelativeDocPos(endTargetBlock.start, this.selectionEnd)
        const childrenSelection = endTargetBlock.correctSelectionPos(null, targetBlockEnd)
        finalEnd = { ops: mergeDocPos(endTargetBlock.start, childrenSelection[0].end as {ops: IDocPos[]}) }
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

  /**
   * 比较两个文档位置，如果 posA 在 posB 后面，就返回 true 否则返回 false
   */
  private compareDocPos(posA: { ops: IDocPos[] }, posB: { ops: IDocPos[] }): boolean {
    const firstPosA = typeof posA.ops[0].retain === 'number' ? posA.ops[0].retain : 0
    const firstPosB = typeof posB.ops[0].retain === 'number' ? posB.ops[0].retain : 0
    if (firstPosA !== firstPosB) {
      return firstPosA > firstPosB
    }
    if (posA.ops.length !== posB.ops.length) {
      return posA.ops.length > posB.ops.length
    }
    if (posA.ops.length === 1 && firstPosA !== 0) { return false }
    const index = posA.ops.length - 1
    return this.compareDocPos(
      posA.ops[index].retain as { ops: IDocPos[] },
      posB.ops[index].retain as { ops: IDocPos[] }
    )
  }
}
