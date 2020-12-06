import { IRenderStructure } from '../Common/IRenderStructure'
import { IBubbleUpable } from '../Common/IBubbleElement'
import { EnumCursorType } from '../Common/EnumCursorType'
import ICanvasContext from '../Common/ICanvasContext'
import Op from 'quill-delta-enhanced/dist/Op'
import { ILinkedListNode, ILinkedList, ILinkedListDecorator } from '../Common/LinkedList'
import { IPointerInteractiveDecorator, IPointerInteractive } from '../Common/IPointerInteractive'
import ITableRowAttributes, { TableRowDefaultAttributes } from './TableRowAttributes'
import Delta from 'quill-delta-enhanced'
import TableCell from './TableCell'
import { collectAttributes, getFormat, increaseId } from '../Common/util'
import ICoordinatePos from '../Common/ICoordinatePos'
import IRangeNew from '../Common/IRangeNew'
import Table from './Table'
import { IAttributable, IAttributableDecorator, IAttributes } from '../Common/IAttributable'

@ILinkedListDecorator
@IPointerInteractiveDecorator
@IAttributableDecorator
export default class TableRow implements ILinkedList<TableCell>, ILinkedListNode, IRenderStructure, IBubbleUpable, IAttributable {
  public readonly id: number = increaseId();
  get start(): number {
    return this.prevSibling === null
      ? 0
      : this.prevSibling.start + 1
  }
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
  public defaultAttributes: ITableRowAttributes = TableRowDefaultAttributes
  public overrideDefaultAttributes: Partial<ITableRowAttributes> | null = null
  public originalAttributes: Partial<ITableRowAttributes> | null = null
  public overrideAttributes: Partial<ITableRowAttributes> | null = null

  /**
   * 最小内容高度，指综合计算当前行所有单元格的 contentHeight 和所有在此行结束的跨行单元格的 contentHeight
   * 之后得出的，能放下上述所有单元格的行高
   * 当前行的实际高度小于 contentMinHeight 时就会有单元格的内容超出此行
   */
  public contentMinHeight: number = 0

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

  public toOp(withKey: boolean): Op {
    const cellOps = this.children.map(cell => cell.toOp(withKey))
    const res: Op = {
      insert: new Delta(cellOps),
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
    this.attributes.height = height
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
      y = Math.floor(y)
      this.y = y
      if (recursive) {
        let currentRow = this
        let nextSibling = this.nextSibling
        while (nextSibling !== null) {
          nextSibling.y = (Math.floor(currentRow.y + currentRow.height))
          currentRow = nextSibling
          nextSibling = currentRow.nextSibling
        }
      }
    }
  }

  public destroy(): void {
    throw new Error('Method not implemented.')
  }
  public bubbleUp(type: string, data: any, stack: any[]) {
    if (this.parent) {
      stack.push(this)
      this.parent.bubbleUp(type, data, stack)
    }
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

  public getFormat(range?: IRangeNew): { [key: string]: Set<any> } {
    let res: { [key: string]: Set<any> } = {}
    if (!range) {
      res = getFormat(this)
    } else {
      if (range.start?.inner && range.end?.inner) {
        res = getFormat(this, [{
          start: range.start.inner,
          end: range.end.inner,
        }])
      } else {
        res = {}
      }
    }
    collectAttributes(this.attributes, res)
    return res
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

  // #region override IAttributableDecorator method
  setAttributes(attr: IAttributes | null | undefined): void {
    throw new Error('Method not implemented.')
  }
  setOverrideDefaultAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  setOverrideAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  compileAttributes(): void {
    throw new Error('Method not implemented.')
  }
  // #endregion
}
