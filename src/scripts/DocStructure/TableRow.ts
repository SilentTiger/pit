import { IRenderStructure } from '../Common/IRenderStructure'
import { IBubbleUpable } from '../Common/IBubbleElement'
import { EnumCursorType } from '../Common/EnumCursorType'
import ICanvasContext from '../Common/ICanvasContext'
import Op from 'quill-delta-enhanced/dist/Op'
import { ILinkedListNode, ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import Table from './Table'
import { IPointerInteractiveDecorator, IPointerInteractive } from '../Common/IPointerInteractive'
import ITableRowAttributes, { TableRowDefaultAttributes } from './TableRowAttributes'
import Delta from 'quill-delta-enhanced'
import TableCell from './TableCell'

@ILinkedListDecorator
@IPointerInteractiveDecorator
export default class TableRow implements ILinkedList<TableCell>, ILinkedListNode, IRenderStructure, IBubbleUpable {
  public children: TableCell[] = []
  public head: TableCell | null = null
  public tail: TableCell | null = null
  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: Table | null = null
  public x: number = 0
  public y: number = 0
  public width: number = 0
  public height: number = 0
  public attributes: ITableRowAttributes = { ...TableRowDefaultAttributes }
  private cellMargin = 5

  public readFromOps(Ops: Op[]): void {
    // tableRow 的 op 只会有一条，所以直接取第一条
    const delta = Ops[0].insert as Delta
    const height = Ops[0]?.attributes?.height
    if (typeof height === 'number') {
      this.attributes.height = height
    }

    const cells = delta.ops.map(op => {
      const cell = new TableCell()
      cell.readFromOps([op])
      return cell
    })
    this.addAll(cells)
  }

  /**
   * 对表格行进行排版
   * @param colWidth 本行中每一个单元格的宽度
   *
   * 注意：colWidth 的类型是 Array<number | string>，
   * number 类型表示该位置需要设置单元格
   * string 类型表示该位置不需要设置单元格而应该留出 string 所表示的宽度
   * 用 number 和 string 类型来处理前面的行中单元格跨行的问题
   */
  public layout(colWidth: Array<{width: number, span: number}>): number[] {
    const minusCol = Array(colWidth.length).fill(0)
    let newHeight = 0
    let cellIndex = 0
    let currentCellX = this.cellMargin

    if (this.children.length > 0) {
      for (let i = 0, l = colWidth.length; i < l; i++) {
        if (colWidth[i].span === 0) {
          const currentCell = this.children[cellIndex]

          currentCell.x = currentCellX
          let cellWidth = 0
          const widthIndex = i
          for (let j = 0; j < currentCell.attributes.colSpan; j++) {
            cellWidth += colWidth[widthIndex + j].width + this.cellMargin
            i++
          }
          i--
          cellWidth -= this.cellMargin

          currentCell.setSize({
            width: cellWidth,
          })
          currentCell.layout()
          newHeight = Math.max(newHeight, currentCell.height)

          if (currentCell.attributes.rowSpan > 1) {
            for (let j = 0; j < currentCell.attributes.colSpan; j++) {
              minusCol[widthIndex + j] += currentCell.attributes.rowSpan
            }
          }
          currentCellX += cellWidth + this.cellMargin
          cellIndex++
        } else {
          currentCellX += colWidth[i].width + this.cellMargin
        }
      }
    }

    newHeight = Math.max(newHeight, this.attributes.height)
    // 重新给每个 cell 设置高度
    for (let index = 0; index < this.children.length; index++) {
      this.children[index].setSize({ height: newHeight })
    }

    if (newHeight !== this.height) {
      this.height = newHeight
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
    return minusCol
  }

  /**
   * 设置当前 row 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number, recursive = true, force = false): void {
    if (force === true || this.y !== y) {
      y = Math.floor(y)
      this.y = y
      if (recursive) {
        let currentBlock = this
        let nextSibling = this.nextSibling
        while (nextSibling !== null) {
          nextSibling.y = (Math.floor(currentBlock.y + currentBlock.height))
          currentBlock = nextSibling
          nextSibling = currentBlock.nextSibling
        }
      }
    }
  }

  destroy(): void {
    throw new Error('Method not implemented.')
  }
  bubbleUp(type: string, data: any, stack: any[]): void {
    throw new Error('Method not implemented.')
  }
  draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const cell = this.children[index]
      cell.draw(ctx, this.x + x, this.y + y, viewHeight)
    }
  }
  drawBorder(ctx: ICanvasContext, x: number, y: number, firstLine: boolean, lastLine: boolean) {
    for (let index = 0; index < this.children.length; index++) {
      const cell = this.children[index]
      cell.drawBorder(ctx,
        this.x + x,
        this.y + y,
        firstLine,
        lastLine,
        index === 0,
        index === this.children.length - 1
      )
    }
  }

  getCursorType(): EnumCursorType {
    throw new Error('Method not implemented.')
  }

  // #region IPointerInteractive methods
  public onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerLeave(): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerDown(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerUp(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerTap(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  // #endregion

  // #region override LinkedList method
  add(node: TableCell): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAfter(node: TableCell, target: TableCell): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addBefore(node: TableCell, target: TableCell): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAtIndex(node: TableCell, index: number): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  addAll(nodes: TableCell[]): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAll(): TableCell[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  remove(node: TableCell): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  removeAllFrom(node: TableCell): TableCell[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  splice(start: number, deleteCount: number, nodes?: TableCell[] | undefined): TableCell[] {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
    return []
  }
  findIndex(node: TableCell): void {
    // this method should be implemented in ILinkedListDecorator and be override in OverrideLinkedListDecorator
  }
  // #endregion
}
