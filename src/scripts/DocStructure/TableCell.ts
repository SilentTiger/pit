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
  public drawBorder(ctx: ICanvasContext, x: number, y: number, firstLine: boolean, lastLine: boolean, firstCell: boolean, lastCell: boolean) {
    // 每个单元格都只绘制自己的右边框和下边框，但如果当前单元格在表格的最外圈，边框绘制的长度和位置会有变化
    ctx.strokeStyle = '#000'
    const startX = this.x + x
    const startY = this.y + y
    // 先绘制右边框
    if (!lastCell) {
      const x = startX + this.width + 3
      const y1 = startY - (firstLine ? 5 : 3)
      const y2 = startY + this.height + (lastLine ? 5 : 3)
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
      ctx.stroke()
    }
    // 再绘制下边框
    if (!lastLine) {
      const y = findHalf(startY + this.height + 3)
      const x1 = startX - (firstCell ? 5 : 3)
      const x2 = startX + this.width + (lastCell ? 5 : 3)
      ctx.moveTo(x1, y)
      ctx.lineTo(x2, y)
      ctx.stroke()
    }
  }
}
