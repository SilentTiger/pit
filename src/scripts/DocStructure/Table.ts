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
import { IPointerInteractiveDecorator } from '../Common/IPointerInteractive'
import Delta from 'quill-delta-enhanced'
import ITableAttributes, { TableDefaultAttributes } from './TableAttributes'

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
      for (let i = 0, l = this.children.length; i < l; i++) {
        const current = this.children[i]
        current.width = this.width
        const newMinusCol = current.layout(currentColWidth)
        currentColWidth.forEach((colWidthItem, index) => {
          colWidthItem.span = Math.max(0, colWidthItem.span - 1 + newMinusCol[index])
        })

        if (current.prevSibling !== null) {
          current.y = current.prevSibling.y + current.height + this.rowMargin
        } else {
          current.y = this.rowMargin
        }
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
    console.log('getChildrenStackByPos not implement')
    return []
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
      if (row.y + y >= 0 && row.y + y < viewHeight) {
        row.draw(ctx, this.x + x, this.y + y, viewHeight - this.y - y)
      }
    }

    super.draw(ctx, x, y, viewHeight)
  }

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
