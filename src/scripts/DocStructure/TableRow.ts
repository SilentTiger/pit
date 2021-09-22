import type { IRenderStructure } from '../Common/IRenderStructure'
import type { IBubbleUpable } from '../Common/IBubbleUpable'
import { IBubbleUpableDecorator } from '../Common/IBubbleUpable'
import { EnumCursorType } from '../Common/EnumCursorType'
import type ICanvasContext from '../Common/ICanvasContext'
import type Op from 'quill-delta-enhanced/dist/Op'
import type { ILinkedListNode, ILinkedList } from '../Common/LinkedList'
import { ILinkedListDecorator } from '../Common/LinkedList'
import type { IPointerInteractive } from '../Common/IPointerInteractive'
import { IPointerInteractiveDecorator } from '../Common/IPointerInteractive'
import type ITableRowAttributes from './TableRowAttributes'
import { TableRowDefaultAttributes } from './TableRowAttributes'
import Delta from 'quill-delta-enhanced'
import TableCell from './TableCell'
import {
  collectAttributes,
  findChildInDocPos,
  getFormat,
  getRelativeDocPos,
  hasIntersection,
  increaseId,
} from '../Common/util'
import type IRange from '../Common/IRange'
import type Table from './Table'
import type { IAttributable, IAttributes } from '../Common/IAttributable'
import { IAttributableDecorator } from '../Common/IAttributable'
import type { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import type { DocPos } from '../Common/DocPos'
import type { ISelectedElementGettable } from '../Common/ISelectedElementGettable'
import { ISelectedElementGettableDecorator } from '../Common/ISelectedElementGettable'

@ISelectedElementGettableDecorator
@IBubbleUpableDecorator
@ILinkedListDecorator
@IPointerInteractiveDecorator
@IAttributableDecorator
export default class TableRow
  implements
    ILinkedList<TableCell>,
    ILinkedListNode,
    IRenderStructure,
    IBubbleUpable,
    IAttributable,
    ISelectedElementGettable
{
  public readonly id: number = increaseId()
  get start(): number {
    return this.prevSibling === null ? 0 : this.prevSibling.start + 1
  }
  get length(): number {
    return this.children.length
  }
  public children: TableCell[] = []
  public head: TableCell | null = null
  public tail: TableCell | null = null
  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: Table | null = null
  public x = 0
  public y = 0
  public width = 0
  public height = 0
  public attributes: ITableRowAttributes = { ...TableRowDefaultAttributes }
  public defaultAttributes: ITableRowAttributes = TableRowDefaultAttributes
  public overrideDefaultAttributes: Partial<ITableRowAttributes> | null = null
  public originalAttributes: Partial<ITableRowAttributes> | null = null
  public overrideAttributes: Partial<ITableRowAttributes> | null = null

  /**
   * 最小内容高度，指综合计算当前行所有单元格的 contentHeight 和所有在此行结束的跨行单元格的 contentHeight
   * 之后得出的，能放下上述所有单元格的行高
   * 当前行的实际高度小于 contentMinHeight 时就会有单元格的内容超出此行
   */
  public contentMinHeight = 0

  public readFromOps(Ops: Op[]): void {
    // tableRow 的 op 只会有一条，所以直接取第一条
    const delta = Ops[0].insert as Delta
    const height = Ops[0]?.attributes?.height
    if (typeof height === 'number') {
      this.attributes.height = height
    }

    const cells = delta.ops.map((op) => {
      const cell = new TableCell()
      cell.readFromOps([op])
      return cell
    })
    this.addAll(cells)
  }

  public toOp(withKey: boolean): Op {
    const cellOps = this.children.map((cell) => cell.toOp(withKey))
    const res: Op = {
      insert: new Delta(cellOps),
    }
    if (withKey) {
      res.key = this.id
    }
    if (this.originalAttributes && Object.keys(this.originalAttributes).length > 0) {
      res.attributes = { ...this.originalAttributes }
    }
    return res
  }

  /**
   * 设置当前行的高度
   */
  public setHeight(height: number) {
    if (height >= this.contentMinHeight) {
      this.height = height
    }
  }

  /**
   * 设置当前行 attributes 中的 height
   */
  public setHeightAttribute(height: number) {
    this.setAttributes({ height })
  }

  /**
   * 设置当前行的最小内容高度
   */
  public setContentMinHeight(height: number) {
    this.contentMinHeight = height
  }

  /**
   * 设置当前 row 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number, recursive = true, force = false): void {
    if (force === true || this.y !== y) {
      this.y = Math.floor(y)
      if (recursive) {
        let currentRow = this
        let nextSibling = this.nextSibling
        while (nextSibling !== null) {
          nextSibling.y = Math.floor(currentRow.y + currentRow.height)
          currentRow = nextSibling
          nextSibling = currentRow.nextSibling
        }
      }
    }
  }

  public destroy(): void {
    throw new Error('Method not implemented.')
  }
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const cell = this.children[index]
      cell.draw(ctx, this.x + x, this.y + y, viewHeight)
    }
  }
  public drawBorder(ctx: ICanvasContext, x: number, y: number) {
    for (let index = 0; index < this.children.length; index++) {
      const cell = this.children[index]
      cell.drawBorder(ctx, this.x + x, this.y + y)
    }
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.ColResize
  }

  public format(attr: Partial<IFragmentOverwriteAttributes>, range?: IRange) {
    this.setAttributes(attr)
    if (range && (range.start.inner || range.end.inner)) {
      // 说明是部分单元格被 format
      // 如果 range 存在，range 的 start 的 inner 和 end 的 inner 一定不能是 null
      const rangeInRow = {
        start: range.start.inner ?? { index: 0, inner: null },
        end: range.end.inner ?? { index: this.children.length, inner: null },
      }
      // 这里要注意，因为 table cell 的 length 其实是 DocContent 的 length，所以它的 length 不是 1，也就不能用 util 中的 format 方法
      // 只能在这里单独写一个由 util.format 改编的逻辑
      if (rangeInRow) {
        const startChild = findChildInDocPos(rangeInRow.start.index, this.children, true)
        let endChild = findChildInDocPos(rangeInRow.end.index, this.children, true)
        if (!startChild || !endChild) {
          return
        }

        endChild =
          endChild.start === rangeInRow.end.index && rangeInRow.end.inner === null ? endChild.prevSibling : endChild
        if (!startChild || !endChild) {
          return
        }

        if (startChild === endChild) {
          startChild.format(attr, {
            start: getRelativeDocPos(startChild.start, rangeInRow.start),
            end: getRelativeDocPos(endChild.start, rangeInRow.end),
          })
        } else {
          let currentCell: TableCell | null = endChild
          while (currentCell) {
            if (currentCell === startChild) {
              if (currentCell.start === rangeInRow.start.index && rangeInRow.start.inner === null) {
                currentCell.format(attr)
              } else {
                currentCell.format(attr, {
                  start: { index: rangeInRow.start.index - currentCell.start, inner: rangeInRow.start.inner },
                  end: { index: currentCell.start + 1, inner: null },
                })
              }
              break
            } else if (currentCell === endChild) {
              if (currentCell.start + 1 === rangeInRow.end.index && rangeInRow.end.inner === null) {
                currentCell.format(attr)
              } else {
                currentCell.format(attr, {
                  start: { index: 0, inner: null },
                  end: { index: rangeInRow.end.index - currentCell.start, inner: rangeInRow.end.inner },
                })
              }
            } else {
              currentCell.format(attr)
            }
            currentCell = currentCell.prevSibling
          }
        }
      } else {
        for (let index = 0; index < this.children.length; index++) {
          const frag = this.children[index]
          frag.format(attr)
        }
      }
    } else {
      // 说明所有单元格都要被 format
      for (let index = 0; index < this.children.length; index++) {
        const cell = this.children[index]
        cell.format(attr)
      }
    }
  }

  public clearFormat(range?: IRange) {
    this.setAttributes({ ...TableRowDefaultAttributes })
    if (range && (range.start.inner || range.end.inner)) {
      // 说明是部分单元格被 format
      // 如果 range 存在，range 的 start 的 inner 和 end 的 inner 一定不能是 null
      const rangeInRow = {
        start: range.start.inner ?? { index: 0, inner: null },
        end: range.end.inner ?? { index: this.children.length, inner: null },
      }
      // 这里要注意，因为 table cell 的 length 其实是 DocContent 的 length，所以它的 length 不是 1，也就不能用 util 中的 format 方法
      // 只能在这里单独写一个由 util.format 改编的逻辑
      if (rangeInRow) {
        const startChild = findChildInDocPos(rangeInRow.start.index, this.children, true)
        let endChild = findChildInDocPos(rangeInRow.end.index, this.children, true)
        if (!startChild || !endChild) {
          return
        }

        endChild =
          endChild.start === rangeInRow.end.index && rangeInRow.end.inner === null ? endChild.prevSibling : endChild
        if (!startChild || !endChild) {
          return
        }

        if (startChild === endChild) {
          startChild.clearFormat({
            start: getRelativeDocPos(startChild.start, rangeInRow.start),
            end: getRelativeDocPos(endChild.start, rangeInRow.end),
          })
        } else {
          let currentCell: TableCell | null = endChild
          while (currentCell) {
            if (currentCell === startChild) {
              if (currentCell.start === rangeInRow.start.index && rangeInRow.start.inner === null) {
                currentCell.clearFormat()
              } else {
                currentCell.clearFormat({
                  start: { index: rangeInRow.start.index - currentCell.start, inner: rangeInRow.start.inner },
                  end: { index: currentCell.start + 1, inner: null },
                })
              }
              break
            } else if (currentCell === endChild) {
              if (currentCell.start + 1 === rangeInRow.end.index && rangeInRow.end.inner === null) {
                currentCell.clearFormat()
              } else {
                currentCell.clearFormat({
                  start: { index: 0, inner: null },
                  end: { index: rangeInRow.end.index - currentCell.start, inner: rangeInRow.end.inner },
                })
              }
            } else {
              currentCell.clearFormat()
            }
            currentCell = currentCell.prevSibling
          }
        }
      } else {
        for (let index = 0; index < this.children.length; index++) {
          const frag = this.children[index]
          frag.clearFormat()
        }
      }
    } else {
      // 说明所有单元格都要被 format
      for (let index = 0; index < this.children.length; index++) {
        const cell = this.children[index]
        cell.clearFormat()
      }
    }
  }

  public getFormat(range?: IRange): { [key: string]: Set<any> } {
    let res: { [key: string]: Set<any> } = {}
    if (!range) {
      res = getFormat(this)
    } else if (range.start?.inner && range.end?.inner) {
      res = getFormat(this, [
        {
          start: range.start.inner,
          end: range.end.inner,
        },
      ])
    } else {
      res = {}
    }
    collectAttributes(this.attributes, res)
    return res
  }

  public lastLinePos(x: number): DocPos | null {
    let targetCellIndex = 0
    let targetCell = this.children[targetCellIndex]
    for (let cellIndex = 0; cellIndex < this.children.length; cellIndex++) {
      const cell = this.children[cellIndex]
      if (
        (cellIndex === 0 && x <= cell.x) ||
        hasIntersection(cell.x, cell.x + cell.width, x, x) ||
        (cellIndex === this.children.length - 1 && x >= cell.x + cell.width)
      ) {
        targetCellIndex = cellIndex
        targetCell = cell
        break
      }
    }
    const xPosInCell = x - targetCell.x
    const res = targetCell.lastLinePos(xPosInCell)
    return res
      ? {
          index: targetCellIndex,
          inner: res,
        }
      : null
  }

  public firstLinePos(x: number): DocPos | null {
    let targetCellIndex = 0
    let targetCell = this.children[targetCellIndex]
    for (let cellIndex = 0; cellIndex < this.children.length; cellIndex++) {
      const cell = this.children[cellIndex]
      if (
        (cellIndex === 0 && x <= cell.x) ||
        hasIntersection(cell.x, cell.x + cell.width, x, x) ||
        (cellIndex === this.children.length - 1 && x >= cell.x + cell.width)
      ) {
        targetCellIndex = cellIndex
        targetCell = cell
        break
      }
    }
    const xPosInCell = x - targetCell.x
    const res = targetCell.firstLinePos(xPosInCell)
    return res
      ? {
          index: targetCellIndex,
          inner: res,
        }
      : null
  }

  // #region IBubbleUpable methods
  public bubbleUp(type: string, data: any, stack?: any[]): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  public setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  // #endregion

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
  public afterAdd(nodes: TableCell[]): void {
    nodes.forEach((node) => {
      node.setBubbleHandler(this.bubbleUp.bind(this))
    })
  }
  public afterRemove(nodes: TableCell[]): void {
    nodes.forEach((node) => {
      node.setBubbleHandler(null)
    })
  }
  public addLast(node: TableCell): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addAfter(node: TableCell, target: TableCell): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addBefore(node: TableCell, target: TableCell): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addAtIndex(node: TableCell, index: number): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addAll(nodes: TableCell[]): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public removeAll(): TableCell[] {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public remove(node: TableCell): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public removeAllFrom(node: TableCell): TableCell[] {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public splice(start: number, deleteCount: number, nodes?: TableCell[] | undefined): TableCell[] {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public findIndex(node: TableCell): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  // #endregion

  // #region override IAttributableDecorator method
  public setAttributes(attr: IAttributes | null | undefined): void {
    throw new Error('Method not implemented.')
  }
  public setOverrideDefaultAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  public setOverrideAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  public compileAttributes(): void {
    throw new Error('Method not implemented.')
  }
  // #endregion

  // #region getSelectedElement methods
  public getSelectedElement(ranges: IRange[]): any[][] {
    throw new Error('Method not implemented.')
  }
  // #endregion
}
