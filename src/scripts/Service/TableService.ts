import Delta from 'quill-delta-enhanced'
import type Document from '../Document/Document'
import type Table from '../Block/Table'
import type TableRow from '../Block/TableRow'
import type { HistoryStackService } from './HistoryStackService'
import Service from './Service'

export default class TableService extends Service {
  private stack: HistoryStackService
  private modifyStatus: Map<Table, Delta> = new Map()

  constructor(doc: Document, stack: HistoryStackService) {
    super(doc)
    this.stack = stack
  }

  public startModify(table: Table): void {
    this.modifyStatus.set(table, new Delta(table.toOp(true)))
  }

  public updateModifyRowHeight(row: TableRow, height: number): void {
    row.setHeightAttribute(height)
  }

  public updateModifyColumnWidth(
    table: Table,
    leftColumnIndex: number,
    leftWidth: number,
    rightColumnIndex: number,
    rightWidth: number,
  ): void {
    table.setColWidth(leftWidth, leftColumnIndex)
    table.setColWidth(rightWidth, rightColumnIndex)
    table.needLayout = true
    table.children.forEach((row) => {
      // 把受影响的 cell 也置为需要排版
      for (let index = 0; index < row.children.length; index++) {
        const cell = row.children[index]
        if (
          (cell.GridColPos <= leftColumnIndex && leftColumnIndex <= cell.GridColPos + cell.attributes.colSpan - 1) ||
          (cell.GridColPos <= rightColumnIndex && rightColumnIndex <= cell.GridColPos + cell.attributes.colSpan - 1)
        ) {
          cell.setNeedToLayout()
        }
      }
    })
  }

  public updateLastColumnWidth(table: Table, newColWidth: number, newTableWidth: number): void {
    table.setColWidth(newColWidth, table.attributes.colWidth.length - 1)
    table.setWidth(newTableWidth)
    table.needLayout = true
    table.children.forEach((row) => {
      if (row.tail) {
        row.tail.setNeedToLayout()
      }
    })
  }

  public endModify(table: Table): void {
    const oldDelta = this.modifyStatus.get(table)
    if (oldDelta) {
      const newDelta = new Delta(table.toOp(true))
      const diff = oldDelta.diff(newDelta)
      const res = new Delta()
      if (table.start > 0) {
        res.retain(table.start)
      }
      if (diff.ops.length > 0) {
        this.stack.pushDiff(res.concat(diff))
      }
      this.modifyStatus.delete(table)
    }
  }
}
