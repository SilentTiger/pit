import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import Block from './Block'
import Op from 'quill-delta-enhanced/dist/Op'
import LayoutFrameAttributes from './LayoutFrameAttributes'
import FragmentTextAttributes from './FragmentTextAttributes'
import { IRenderStructure } from '../Common/IRenderStructure'
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import { ISearchResult } from '../Common/ISearchResult'
import LayoutFrame from './LayoutFrame'
import IRange from '../Common/IRange'
import TableRow from './TableRow'
import { ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import { IPointerInteractiveDecorator, IPointerInteractive } from '../Common/IPointerInteractive'
import Delta from 'quill-delta-enhanced'
import ITableAttributes, { TableDefaultAttributes } from './TableAttributes'
import { findHalf, isPointInRectangle } from '../Common/util'
import TableCell from './TableCell'
import { EnumCursorType } from '../Common/EnumCursorType'

@ILinkedListDecorator
@IPointerInteractiveDecorator
export default class Table extends Block implements ILinkedList<TableRow> {
  public static readonly blockType: string = 'table'
  public children: TableRow[] = []
  public head: TableRow | null = null
  public tail: TableRow | null = null
  public attributes: ITableAttributes = { ...TableDefaultAttributes }
  private rowMargin = 5

  public readFromOps(Ops: Op[]): void {
    // table 的 op 只会有一条，所以直接取第一条
    const delta = Ops[0].insert as Delta
    const colWidth = Ops[0]?.attributes?.colWidth
    if (colWidth) {
      this.setColWidth(colWidth)
    }
    const width = Ops[0]?.attributes?.width
    if (typeof width === 'number') {
      this.attributes.width = width
    }

    const rows = delta.ops.map(op => {
      const row = new TableRow()
      row.readFromOps([op])
      return row
    })
    this.addAll(rows)
  }

  public layout(): void {
    if (this.needLayout) {
      const currentColWidth = this.attributes.colWidth.map(width => {
        return {
          width,
          span: 0,
        }
      })
      // 先每行排版一次，计算每个单元格的宽度和单元格内容的高度，并计算出不考虑跨行单元格时每行的最小高度
      for (let i = 0, l = this.children.length; i < l; i++) {
        const current = this.children[i]
        current.width = this.width
        const newMinusCol = current.layout(currentColWidth, i, this.children.length)
        currentColWidth.forEach((colWidthItem, index) => {
          colWidthItem.span = Math.max(0, colWidthItem.span - 1 + newMinusCol[index])
        })
      }

      // 先把所有的跨行单元格都找出来
      const rowSpanCell: Array<{ cell: TableCell, rowIndex: number }> = []
      for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
        const row = this.children[rowIndex]
        for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
          const cell = row.children[cellIndex]
          if (cell.attributes.rowSpan > 1) {
            rowSpanCell.push({
              cell,
              rowIndex,
            })
          }
        }
      }
      let needChangeRowHeight = rowSpanCell.length > 0

      // 1、再遍历每一个跨行的单元格
      // 2、找出那些单元格所跨的行的最小高度之和不满足该单元格的高度的单元格，并计算出对应的需要调整哪一行的高度，以及调整的大小
      // 3、再把这些需要调整的行的 index 从小到大排列，依次调整他们的高度，每调整完一行，就重新执行前两步逻辑，直到没有需要调整高度的行为止
      while (needChangeRowHeight) {
        const toChange: Map<number, number> = new Map()

        for (let index = 0; index < rowSpanCell.length; index++) {
          const { cell, rowIndex } = rowSpanCell[index]
          const cellContentHeight = cell.contentHeight
          const rowsMinHeight = this.rowMargin * (cell.attributes.rowSpan - 1) +
              this.children
                .slice(rowIndex, rowIndex + cell.attributes.rowSpan)
                .reduce((sum, row) => { return sum + row.height }, 0)
          if (cellContentHeight > rowsMinHeight) {
            const newHeight = Math.ceil(cellContentHeight - rowsMinHeight)
            const newIndex = rowIndex + cell.attributes.rowSpan - 1
            if (
              !toChange.has(newIndex) ||
                (toChange.get(newIndex) as number) < newHeight
            ) {
              toChange.set(newIndex, newHeight)
            }
          }
        }

        needChangeRowHeight = toChange.size > 0
        if (needChangeRowHeight) {
          const targetRowIndex = Array.from(toChange.keys()).sort((a, b) => {
            return a - b
          })[0]
          const targetRowHeightChange = toChange.get(targetRowIndex) as number

          // 这样就求出了当前这一轮需要给哪一行增加多少高度
          const targeRow = this.children[targetRowIndex]
          if (targeRow) {
            targeRow.setHeight(targeRow.height + targetRowHeightChange)
          }
        }
      }

      // 上面终于计算好了每个行的行高，再把那些高度不够的单元格的高度补上，这里只有跨行的单元格有可能需要补
      for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
        const row = this.children[rowIndex]
        for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
          const cell = row.children[cellIndex]
          if (cell.attributes.rowSpan > 1) {
            const cellContentHeight = cell.contentHeight
            const rowsMinHeight = this.rowMargin * (cell.attributes.rowSpan - 1) +
              this.children
                .slice(rowIndex, rowIndex + cell.attributes.rowSpan)
                .reduce((sum, row) => { return sum + row.height }, 0)
            if (cellContentHeight < rowsMinHeight) {
              cell.setHeight(rowsMinHeight)
            }
          }
        }
      }

      // 再设置每行的 y 坐标
      if (this.head) {
        this.head.setPositionY(this.rowMargin, true, true)
      }

      this.needLayout = false

      if (this.tail !== null) {
        this.setSize({ height: this.tail.y + this.tail.height + this.rowMargin })
      }
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.RowResize
  }

  public search(keywords: string, trigger?: boolean | undefined): ISearchResult[] {
    console.log('search not implement')
    return []
  }
  public getDocumentPos(x: number, y: number): number {
    console.log('getDocumentPos not implement')
    return 0
  }
  public getSelectionRectangles(index: number, length: number, correctByPosY?: number | undefined): IRectangle[] {
    console.log('getSelectionRectangles not implement')
    return []
  }
  public getChildrenStackByPos(x: number, y: number): IRenderStructure[] {
    // 表格这里的实现和其他类有很大的区别，因为表格的 cell 会跨行，所以不能按照层级先在行里面找再在列里面找
    // 而要直接遍历所有的 cell，看命中哪个 cell，再反推出 row

    let findRow: TableRow | null = null
    let findCell: TableCell | null = null
    for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
      const row = this.children[rowIndex]
      for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
        const cell = row.children[cellIndex]
        if (isPointInRectangle(x - row.x, y - row.y, cell)) {
          findRow = row
          findCell = cell
          break
        }
      }
      if (findCell) {
        break
      } else {
        if (isPointInRectangle(x, y, row)) {
          findRow = row
        }
      }
    }

    let res: IRenderStructure[] = []
    if (findCell && findRow) {
      res = findCell.getChildrenStackByPos(x - findRow.x - findCell.x, y - findRow.y - findCell.y)
    }
    if (findRow) {
      res.unshift(findRow)
    }
    res.unshift(this)
    return res
  }
  public insertEnter(index: number, attr?: Partial<LayoutFrameAttributes> | undefined): Block | null {
    console.log('insertEnter not implement')
    return null
  }
  public toOp(): Op[] {
    console.log('toOp not implement')
    return []
  }
  public toHtml(selection?: IRange | undefined): string {
    console.log('toHtml not implement')
    return ''
  }
  public insertText(content: string, index: number, hasDiffFormat: boolean, attr?: Partial<FragmentTextAttributes> | undefined, composing?: boolean | undefined): void {
    console.log('insertText not implement')
  }
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    console.log('getFormat not implement')
    return {}
  }
  public format(attr: Partial<IFragmentOverwriteAttributes>, index: number, length: number): void {
    console.log('format not implement')
  }
  public clearFormat(index: number, length: number): void {
    console.log('clearFormat not implement')
  }
  public replace(index: number, length: number, replaceWords: string): Op[] {
    console.log('replace not implement')
    return []
  }
  public delete(index: number, length: number): void {
    console.log('delete not implement')
  }
  public getAllLayoutFrames(): LayoutFrame[] {
    console.log('getAllLayoutFrames not implement')
    return []
  }
  public merge(target: this): void {
    console.log('merge not implement')
  }

  public setColWidth(width: number[]): void
  public setColWidth(width: number, index: number): void
  public setColWidth(width: number | number[], index?: number): void {
    if (Array.isArray(width)) {
      this.attributes.colWidth = width
    } else if (typeof width === 'number' && typeof index === 'number') {
      this.attributes.colWidth[index] = width
    }
  }

  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const row = this.children[index]
      // row 里面可能有单元格会跨行，所以就算 row 超过了屏幕上沿也要绘制
      if (row.y < viewHeight) {
        row.draw(ctx, this.x + x, this.y + y, viewHeight - this.y - y)
        row.drawBorder(ctx, this.x + x, this.y + y)
      }
    }

    // 绘制表格外边框
    const borderX = findHalf(this.x + x, 1)
    const borderY = findHalf(this.y + y, 1)
    ctx.strokeRect(borderX, borderY, Math.floor(this.width - (borderX - this.x - x)), Math.round(this.height))

    super.draw(ctx, x, y, viewHeight)
  }

  // #region override Table method
  public onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerLeave(): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerDown(x: number, y: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerUp(x: number, y: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  public onPointerTap(x: number, y: number): void {
    // this method should be implemented in IPointerInteractiveDecorator
  }
  // #endregion

  // #region override LinkedList method
  add(node: TableRow): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAfter(node: TableRow, target: TableRow): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addBefore(node: TableRow, target: TableRow): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAtIndex(node: TableRow, index: number): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAll(nodes: TableRow[]): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAll(): TableRow[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  remove(node: TableRow): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAllFrom(node: TableRow): TableRow[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  splice(start: number, deleteCount: number, nodes?: TableRow[] | undefined): TableRow[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  findIndex(node: TableRow): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  // #endregion
}
