import { IRenderStructure } from '../Common/IRenderStructure'
import { IBubbleUpable } from '../Common/IBubbleElement'
import Op from 'quill-delta-enhanced/dist/Op'
import { ILinkedListNode } from '../Common/LinkedList'
import TableRow from './TableRow'
import DocContent from './DocContent'
import Delta from 'quill-delta-enhanced'
import ITableCellAttributes, { TableCellDefaultAttributes } from './TableCellAttributes'
import ICanvasContext from '../Common/ICanvasContext'

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
    ctx.strokeStyle = '#ff0000'
    ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)

    super.draw(ctx, x, y, viewHeight)
  }
}
