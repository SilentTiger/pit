import { IRenderStructure } from '../Common/IRenderStructure'
import { IBubbleUpable } from '../Common/IBubbleElement'
import Op from 'quill-delta-enhanced/dist/Op'
import { ILinkedListNode } from '../Common/LinkedList'
import TableRow from './TableRow'
import DocContent from './DocContent'
import Delta from 'quill-delta-enhanced'
import ITableCellAttributes, { TableCellDefaultAttributes } from './TableCellAttributes'
import ICanvasContext from '../Common/ICanvasContext'
import { findHalf } from '../Common/util'

export default class TableCell extends DocContent implements ILinkedListNode, IRenderStructure, IBubbleUpable {
  public x: number = 0
  public y: number = 0
  public width: number = 0
  public height: number = 0
  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: TableRow | null = null
  public attributes: ITableCellAttributes = { ...TableCellDefaultAttributes }
  public needLayout: boolean = true

  public isFirstLine = false
  public isLastLine = false
  public isFirstCell = false
  public isLastCell = false

  public GridRowPos = 0
  public GridColPos = 0

  public readFromOps(Ops: Op[]): void {
    const delta = Ops[0].insert as Delta
    super.readFromChanges(delta)

    this.setAttributes(Ops[0]?.attributes)
  }

  public layout() {
    if (this.needLayout) {
      super.layout()
      this.needLayout = false
    }
  }

  public setAttributes(attrs: any) {
    const colSpan = attrs?.colSpan
    if (typeof colSpan === 'number') {
      this.attributes.colSpan = colSpan
    }
    const rowSpan = attrs?.rowSpan
    if (typeof rowSpan === 'number') {
      this.attributes.rowSpan = rowSpan
    }

    const vertAlign = attrs?.vertAlign
    if (typeof vertAlign === 'number') {
      this.attributes.vertAlign = vertAlign
    }
  }

  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    ctx.fillStyle = 'rgba(255,0,0,0.2)'
    ctx.fillRect(this.x + x, this.y + y, this.width, this.height)

    super.draw(ctx, x, y, viewHeight)
  }

  /**
   * 绘制单元格边框
   * @param firstLine 是否在第一行
   * @param lastLine 是否在最后一行
   * @param firstCell 是否是行中的第一个 cell
   * @param lastCell 是否是行中的最后一个 cell
   */
  public drawBorder(ctx: ICanvasContext, x: number, y: number) {
    // 每个单元格都只绘制自己的右边框和下边框，但如果当前单元格在表格的最外圈，边框绘制的长度和位置会有变化
    ctx.strokeStyle = '#000'
    const startX = this.x + x
    const startY = this.y + y
    ctx.beginPath()
    // 先绘制右边框
    if (!this.isLastCell) {
      const x = findHalf(startX + this.width + 3, -1)
      const y1 = findHalf(startY - (this.isFirstLine ? 5 : 2), -1)
      const y2 = findHalf(startY + this.height + (this.isLastLine ? 5 : 3), 1)
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
    }
    // 再绘制下边框
    if (!this.isLastLine) {
      const y = findHalf(startY + this.height + 3, -1)
      const x1 = findHalf(startX - (this.isFirstCell ? 5 : 2), -1)
      const x2 = findHalf(startX + this.width + (this.isLastCell ? 5 : 3), 1)
      ctx.moveTo(x1, y)
      ctx.lineTo(x2, y)
    }
    ctx.stroke()
  }
}
