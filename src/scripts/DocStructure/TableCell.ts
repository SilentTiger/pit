import { IRenderStructure } from '../Common/IRenderStructure'
import { IBubbleUpable } from '../Common/IBubbleElement'
import Op from 'quill-delta-enhanced/dist/Op'
import { ILinkedListNode } from '../Common/LinkedList'
import TableRow from './TableRow'
import DocContent from './DocContent'
import Delta from 'quill-delta-enhanced'
import ITableCellAttributes, { TableCellDefaultAttributes } from './TableCellAttributes'
import ICanvasContext from '../Common/ICanvasContext'
import { collectAttributes, findHalf, getFormat } from '../Common/util'
import { IPointerInteractive } from '../Common/IPointerInteractive'
import ICoordinatePos from '../Common/ICoordinatePos'
import IRangeNew from '../Common/IRangeNew'
import { isArray } from 'lodash'
import { IAttributable, IAttributableDecorator, IAttributes } from '../Common/IAttributable'
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import { EnumCellVerticalAlign } from './EnumTableStyle'

export enum TableCellBubbleMessage {
  POINTER_ENTER_TABLE_CELL = 'POINTER_ENTER_TABLE_CELL',
  POINTER_LEAVE_TABLE_CELL = 'POINTER_LEAVE_TABLE_CELL',
}

@IAttributableDecorator
export default class TableCell
  extends DocContent
  implements ILinkedListNode, IRenderStructure, IBubbleUpable, IAttributable {
  get start(): number {
    return this.prevSibling === null ? 0 : this.prevSibling.start + 1
  }
  public x = 0
  public y = 0
  public width = 0
  public height = 0
  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: TableRow | null = null
  public attributes: ITableCellAttributes = { ...TableCellDefaultAttributes }
  public defaultAttributes: ITableCellAttributes = TableCellDefaultAttributes
  public overrideDefaultAttributes: Partial<ITableCellAttributes> | null = null
  public originalAttributes: Partial<ITableCellAttributes> | null = null
  public overrideAttributes: Partial<ITableCellAttributes> | null = null

  public paddingLeft = 5
  public paddingRight = 5
  public paddingTop = 5
  public paddingBottom = 5
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

  public toOp(withKey: boolean): Op {
    const res: Op = {
      insert: this.toDelta(withKey),
    }
    if (this.originalAttributes && Object.keys(this.originalAttributes).length > 0) {
      res.attributes = { ...this.originalAttributes }
    }
    return res
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

  /**
   * 设置单元格的宽度，同时给单元格内所有 block 设置新的宽度
   */
  public setWidth(width: number) {
    if (width !== this.width) {
      this.width = width
      for (let index = 0; index < this.children.length; index++) {
        const block = this.children[index]
        block.setWidth(this.width - this.paddingLeft - this.paddingRight)
      }
    }
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
      const x = findHalf(startX + this.width, -1)
      const y1 = findHalf(startY, -1)
      const y2 = findHalf(startY + this.height, 1)
      ctx.moveTo(x, y1)
      ctx.lineTo(x, y2)
    }
    // 再绘制下边框
    if (!this.isLastLine) {
      const y = findHalf(startY + this.height, -1)
      const x1 = findHalf(startX, -1)
      const x2 = findHalf(startX + this.width, 1)
      ctx.moveTo(x1, y)
      ctx.lineTo(x2, y)
    }
    ctx.stroke()
  }

  public onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number) {
    super.onPointerEnter(x, y, targetStack, currentTargetIndex)
    this.bubbleUp(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, null, [])
  }

  public onPointerLeave() {
    super.onPointerLeave()
    this.bubbleUp(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, null, [])
  }

  public bubbleUp(type: string, data: any, stack: any[]) {
    if (this.parent) {
      stack.push(this)
      this.parent.bubbleUp(type, data, stack)
    }
  }

  public getAbsolutePos(): ICoordinatePos | null {
    const parentPos = this.parent?.getAbsolutePos()
    if (parentPos) {
      parentPos.x += this.x
      parentPos.y += this.y
      return parentPos
    } else {
      return null
    }
  }

  public format(attr: IFragmentOverwriteAttributes, ranges?: IRangeNew[] | IRangeNew): Delta {
    this.setAttributes(attr)
    if (ranges === undefined) {
      return super.format(attr)
    } else {
      let res = new Delta()
      const targetRanges = isArray(ranges) ? ranges : [ranges]
      for (let i = 0; i < targetRanges.length; i++) {
        const range = targetRanges[i]
        // 这里 range 的第一层是 cell，所以要向下取一层才能拿到 DocContent 内部的 pos
        if (range.start.inner || range.end.inner) {
          const rangeInCell = {
            start: range.start.inner ?? { index: 0, inner: null },
            end: range.end.inner ?? { index: this.children.length, inner: null },
          }
          res = res.compose(super.format(attr, rangeInCell))
        } else {
          res = res.compose(super.format(attr))
        }
      }
      return res
    }
  }

  public clearFormat(ranges?: IRangeNew[] | IRangeNew): Delta {
    this.setAttributes({ vertAlign: EnumCellVerticalAlign.Top })
    if (ranges === undefined) {
      return super.clearFormat()
    } else {
      let res = new Delta()
      const targetRanges = isArray(ranges) ? ranges : [ranges]
      for (let i = 0; i < targetRanges.length; i++) {
        const range = targetRanges[i]
        // 这里 range 的第一层是 cell，所以要向下取一层才能拿到 DocContent 内部的 pos
        if (range.start.inner || range.end.inner) {
          const rangeInCell = {
            start: range.start.inner ?? { index: 0, inner: null },
            end: range.end.inner ?? { index: this.children.length, inner: null },
          }
          res = res.compose(super.clearFormat(rangeInCell))
        } else {
          res = res.compose(super.clearFormat())
        }
      }
      return res
    }
  }

  public getFormat(ranges?: IRangeNew[] | IRangeNew): { [key: string]: Set<any> } {
    let res: { [key: string]: Set<any> } = {}
    if (ranges === undefined) {
      res = getFormat(this)
    } else {
      const targetRanges = isArray(ranges) ? ranges : [ranges]
      for (let i = 0; i < targetRanges.length; i++) {
        const range = targetRanges[i]
        if (range.start?.inner && range.end?.inner) {
          collectAttributes(
            super.getFormat([
              {
                start: range.start.inner,
                end: range.end.inner,
              },
            ]),
            res,
          )
        } else {
          collectAttributes(super.getFormat(), res)
        }
      }
    }
    collectAttributes(this.attributes, res)
    return res
  }

  // #region override IAttributableDecorator method
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
}
