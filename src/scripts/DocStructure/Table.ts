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
import { DocPos } from '../Common/DocPos'

@ILinkedListDecorator
@IPointerInteractiveDecorator
export default class Table extends Block implements ILinkedList<TableRow> {
  public static readonly blockType: string = 'table'
  public readonly needCorrectSelectionPos = true
  public children: TableRow[] = []
  public head: TableRow | null = null
  public tail: TableRow | null = null
  public attributes: ITableAttributes = { ...TableDefaultAttributes }
  public readonly length: number = 1;

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
      this.layoutCells()
      this.calRowContentMinHeightAndCellHeight()

      // 再设置每行的 y 坐标
      if (this.head) {
        this.head.setPositionY(0, true, true)
      }

      this.needLayout = false

      if (this.tail !== null) {
        this.setHeight(this.tail.y + this.tail.height)
      }
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  public layoutCells() {
    const currentColWidth = this.attributes.colWidth.map(width => {
      return {
        width,
        span: 0,
      }
    })
    // 先每行排版一次，计算每个单元格的宽度和单元格内容的高度，并计算出不考虑跨行单元格时每行的最小高度
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentRow = this.children[i]
      currentRow.width = this.width
      const newMinusCol = currentRow.layoutCells(currentColWidth, i, this.children.length)
      currentColWidth.forEach((colWidthItem, index) => {
        colWidthItem.span = Math.max(0, colWidthItem.span - 1 + newMinusCol[index])
      })
    }
  }

  /**
   * 计算每行的 contentMinHeight 和单元格的实际高度
   */
  public calRowContentMinHeightAndCellHeight() {
    // 先处理本行没有跨行的单元格
    for (let index = 0; index < this.children.length; index++) {
      const row = this.children[index]
      row.setContentMinHeight(Math.max(...row.children.filter(cell => cell.attributes.rowSpan <= 1).map(cell => cell.contentHeight)))
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
        const rowsMinHeight = this.children
          .slice(rowIndex, rowIndex + cell.attributes.rowSpan)
          .reduce((sum, row) => { return sum + row.contentMinHeight }, 0)
        if (cellContentHeight > rowsMinHeight) {
          const newIndex = rowIndex + cell.attributes.rowSpan - 1
          if (
            !toChange.has(newIndex) ||
        (toChange.get(newIndex) as number) < cellContentHeight
          ) {
            toChange.set(newIndex, cellContentHeight - rowsMinHeight)
          }
        }
      }

      needChangeRowHeight = toChange.size > 0
      if (needChangeRowHeight) {
        const targetRowIndex = Math.min(...Array.from(toChange.keys()))
        const targetRowHeightChange = toChange.get(targetRowIndex) as number
        // 这样就求出了当前这一轮需要给哪一行增加多少高度
        const targeRow = this.children[targetRowIndex]
        if (targeRow) {
          targeRow.setContentMinHeight(targetRowHeightChange + targeRow.contentMinHeight)
        }
      }
    }

    // 上面已经计算好了要让所有内容都放得下的最小行高，这时再和每个 row 的 attributes 上的 height 比较
    // 如果 row 的 attributes 的 height 更大，要以 attributes 的值为准
    for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
      const row = this.children[rowIndex]
      const finalHeight = Math.max(row.contentMinHeight, row.attributes.height)
      row.setHeight(finalHeight)
    }

    // 上面终于计算好了每个行的行高，再把每个高度不足的 cell 补齐高度
    for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
      const row = this.children[rowIndex]
      for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
        const cell = row.children[cellIndex]
        if (cell.attributes.rowSpan > 1) {
          const cellContentHeight = cell.contentHeight
          const cellHeight = this.children
            .slice(rowIndex, rowIndex + cell.attributes.rowSpan)
            .reduce((sum, row) => { return sum + row.height }, 0)
          if (cellContentHeight < cellHeight) {
            cell.setHeight(cellHeight)
          }
        } else {
          cell.setHeight(row.height)
        }
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

  public correctSelectionPos(start: DocPos | null, end: DocPos | null):
    Array<{ start: DocPos | null, end: DocPos | null }> {
    // 注意传入的参数 start 和 end 在 delta 层面都是没有进入 table 的
    const res: Array<{ start: DocPos | null, end: DocPos | null }> = []
    // start、end 分为四种情况，要分别处理
    if (start !== null && end !== null) {
      start = start.inner
      end = end.inner
      if (start === null && end === null) {
        res.push({
          start: { index: 0, inner: null },
          end: { index: 0, inner: null },
        })
      } else if (start === null && end !== null) {
        // 说明从表格最前面开始，到指定行结束，选中所有相关行
        res.push({
          start: { index: 0, inner: null },
          end: { index: end.index + (end.inner ? 1 : 0), inner: null },
        })
      } else if (start !== null && end !== null) {
        // start 和 end 都有可能只到 row 这一层或者知道 cell 这一层，或者进入到 cell 内部，所以这里逻辑比较复杂
        const startRowPos = start ? start.index : 0
        const endRowPos = end ? end.index : 0
        // 在 row 这一层，如果 start 或 end 没有继续深入，就直接选中所有涉及的 row
        if (start.inner === null || end.inner === null) {
          res.push({
            start: { index: 0, inner: { index: startRowPos, inner: null } },
            end: { index: 0, inner: { index: endRowPos + (end.inner ? 1 : 0), inner: null } },
          })
        } else {
          // 进入这个分支，说明 start 和 end 都深入到了 cell 这一层
          const startRowData = start.inner
          const endRowData = end.inner
          // 都不是 null，表示选取的开始位置和结束位置都在表格内部
          // 这时又分为 3 种情况：跨行、同行跨单元格、单元格内
          // 注意这里还要考虑起始点在表格的内边框上的场景
          const startCellPos = startRowData.index
          const endCellPos = endRowData.index
          if (startRowPos !== endRowPos) {
            // 跨行，这种情况最复杂
            // 比如选区从第 1 行第 1 个单元格开始，到第 2 行第 2 个单元格结束
            // 则实际选中 4 个单元格，第 1 行的第 1、2 两个单元格和第 2 行的第 1、2 两个单元格
            // 计算的大致逻辑是，先根据 startRowPos、endRowPos、startCellPos、endCellPos 计算出选区的 grid 范围
            // 然后根据 grid 范围分别计算每一行的选区用 DocPos 表示的范围

            // 先计算 grid 范围
            const startRow = this.children[startRowPos]
            const endRow = this.children[endRowPos]

            const startCellGridColPosTemp = startRow.children[Math.min(startCellPos, startRow.children.length - 1)].GridColPos
            const endCellGridColPosTemp = endRow.children[Math.min(endCellPos, endRow.children.length - 1)].GridColPos
            const startCellGridColPos = Math.min(startCellGridColPosTemp, endCellGridColPosTemp)
            const endCellGridColPos = Math.max(startCellGridColPosTemp, endCellGridColPosTemp)
            for (let i = startRowPos; i <= endRowPos; i++) {
              const currentRow = this.children[i]
              let startCellIndex: number | null = null
              let endCellIndex: number | null = null
              for (let j = 0; j < currentRow.children.length; j++) {
                const currentCell = currentRow.children[j]
                if (startCellIndex === null && startCellGridColPos <= currentCell.GridColPos) {
                  startCellIndex = j
                }
                if (currentCell.GridColPos + currentCell.attributes.colSpan - 1 >= endCellGridColPos) {
                  endCellIndex = j
                  break
                }
              }
              if (startCellIndex !== null && endCellIndex !== null) {
                res.push({
                  start: { index: 0, inner: { index: i, inner: { index: startCellIndex, inner: null } } },
                  end: { index: 0, inner: { index: i, inner: { index: endRowData?.inner ? endCellIndex + 1 : endCellIndex, inner: null } } },
                })
              }
            }
          } else {
            // 如果是同一行就看是直接选中涉及的单元格还是选中单元格中的内容
            const finalCellPos = endCellPos + (endRowData.inner ? 1 : 0)
            if (startCellPos !== endCellPos) {
              // 跨单元格，选中 startCellPos 到 endCellPos 的所有单元格
              if (startCellPos === 0 && finalCellPos === this.children[startRowPos].children.length) {
                // 如果选中了这一行的所有单元格就直接选中这一行
                res.push({
                  start: { index: 0, inner: { index: startRowPos, inner: null } },
                  end: { index: 0, inner: { index: startRowPos + 1, inner: null } },
                })
              } else {
                res.push({
                  start: { index: 0, inner: { index: startRowPos, inner: { index: startCellPos, inner: null } } },
                  end: { index: 0, inner: { index: startRowPos, inner: { index: finalCellPos, inner: null } } },
                })
              }
            } else {
              // 同一单元格内则不需要做什么改动，直接原样返回
              res.push({
                start: { index: 0, inner: start },
                end: { index: 0, inner: end },
              })
            }
          }
        }
      } else {
        // 进入这个分支表示 start 不是 null 而 end 是 null，按理说不会出现这个场景，因为 start 和 end 是排序过的
        console.warn('end should not be null while start is null')
        res.push({
          start: { index: 0, inner: null },
          end: { index: 0, inner: null },
        })
      }
    } else if (end !== null) {
      // start 是 null，end 不是 null，说明选区是从当前表格之前开始的，则直接选中 end 所在的整行
      end = end.inner
      if (end !== null) {
        const rowPos = end.index
        const finalRowPos = end.inner ? rowPos + 1 : rowPos
        if (finalRowPos >= this.children.length) {
          res.push({
            start: null,
            end: { index: 1, inner: null },
          })
        } else {
          res.push({
            start: null,
            end: {
              index: 0,
              inner: {
                index: finalRowPos,
                inner: null,
              },
            },
          })
        }
      } else {
        // 如果此时 end === null，就不选中任何一行
        res.push({
          start: null,
          end: { index: 0, inner: null },
        })
      }
    } else if (start !== null) {
      start = start.inner
      // end 是 null，start 不是 null，说明选区是从当前表格开始，切结束位置在当前表格之后，则需要选中 start 所在的行
      if (start !== null) {
        const rowPos = start.index
        if (rowPos <= 0) {
          res.push({
            start: { index: 0, inner: null },
            end: null,
          })
        } else {
          res.push({
            start: { index: 0, inner: { index: rowPos, inner: null } },
            end: null,
          })
        }
      } else {
        // 如果此时 start === null，就是从表格的第一行开始选择
        res.push({
          start: { index: 0, inner: null },
          end: null,
        })
      }
    } else {
      // start、end 都是 null，理论上来说不应该进入这个分支
      console.warn('start and end should not be null at same time')
    }
    return res
  }

  public getDocumentPos(x: number, y: number, start: boolean): DocPos | null {
    // 注意 start 参数为 true 的时候表示即将要开始建立选区，而如果当前鼠标正指向表格的边框
    // 是不可以开始建立选区的，因为这时用户按下鼠标是要调整边框位置，比如调整行高或列宽
    // 所以这个时候要返回 null，以避免开始建立选区

    x -= this.x
    y -= this.y
    // 这个方法和下面的 getChildrenStackByPos 方法实现很类似
    let res: DocPos | null = null

    let findRow: TableRow | null = null
    let findCell: TableCell | null = null
    let rowIndex = 0
    let cellIndex = 0
    for (; rowIndex < this.children.length; rowIndex++) {
      cellIndex = 0
      const row = this.children[rowIndex]
      for (; cellIndex < row.children.length; cellIndex++) {
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
        if (isPointInRectangle(x, y, { ...row, height: row.height })) {
          findRow = row
          break
        }
      }
    }

    if (findCell && findRow) {
      const cellInnerPos = findCell.getDocumentPos(x - findRow.x - findCell.x, y - findRow.y - findCell.y)
      const rowInnerPos = {
        index: cellIndex,
        inner: cellInnerPos,
      }
      const tableInnerPos = {
        index: rowIndex,
        inner: rowInnerPos,
      }
      res = {
        index: 0,
        inner: tableInnerPos,
      }
    } else if (findRow && !start) {
      // 只找到了行，还要看当前位置是在哪个单元格的后面
      let findCellIndex = findRow.children.length - 1
      for (; findCellIndex >= 0; findCellIndex--) {
        const cell = findRow.children[findCellIndex]
        if (x >= cell.x + cell.width) {
          break
        }
      }
      res = {
        index: 0,
        inner: {
          index: rowIndex,
          inner: {
            index: findCellIndex + 1,
            inner: null,
          },
        },
      }
    } else if (!start) {
      // 只找到了 table，还要看当前是在哪一行后面
      let findRowIndex = this.children.length - 1
      for (; findRowIndex >= 0; findRowIndex--) {
        const row = this.children[findRowIndex]
        if (y >= row.y + row.height) {
          break
        }
      }
      res = { index: 0, inner: { index: findRowIndex + 1, inner: null } }
    }
    return res
  }

  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number | undefined): IRectangle[] {
    if (start.index === 0 && start.inner === null) {
      // 如果开始位置是从表格前面开始
      if (end.index >= 1) {
        // 如果结束位置在表格后面
        // 选中整个表格
        return [{
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
        }]
      } else if (end.index === 0 && end.inner !== null) {
        // 如果结束位置在表格中间
        // 就看结束位置在第几行，这种情况下只能只能整行选中
        let rowCount = end.inner.index
        if (end.inner.inner !== null) {
          rowCount += 1
        }
        if (rowCount === this.children.length) {
          return [{
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
          }]
        } else {
          const res: IRectangle[] = []
          for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const row = this.children[rowIndex]
            for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
              const cell = row.children[cellIndex]
              res.push({
                x: this.x + row.x + cell.x,
                y: this.y + row.y + cell.y,
                width: cell.width,
                height: cell.height,
              })
            }
          }
          return res
        }
      }
    } else if (start.index === 0 && start.inner !== null) {
      // 如果开始位置是从表格中间
      if (end.index >= 1) {
        // 如果结束位置在表格后面
        // 就看开始位置在第几行，这种情况下只能只能整行选中
        const rowStartIndex = start.inner.index
        if (rowStartIndex === 0) {
          return [{
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
          }]
        } else {
          const res: IRectangle[] = []
          for (let rowIndex = rowStartIndex; rowIndex < this.children.length; rowIndex++) {
            const row = this.children[rowIndex]
            for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
              const cell = row.children[cellIndex]
              res.push({
                x: this.x + row.x + cell.x,
                y: this.y + row.y + cell.y,
                width: cell.width,
                height: cell.height,
              })
            }
          }
          return res
        }
      } else if (end.index === 0 && end.inner !== null) {
        // 这里要么是整行选中，要么是选中若干个单元格，要么是在单元格内部选中部分内容
        // 所以 start 和 end 的数据结构层级深度应该是一样的

        const startRowPos = start.inner.index
        const endRowPos = end.inner.index
        const res: IRectangle[] = []
        if (start.inner.inner === null && end.inner.inner === null) {
          // 如果是整行选中
          for (let rowIndex = startRowPos; rowIndex < endRowPos; rowIndex++) {
            const row = this.children[rowIndex]
            for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
              const cell = row.children[cellIndex]
              res.push({
                x: this.x + row.x + cell.x,
                y: this.y + row.y + cell.y,
                width: cell.width,
                height: cell.height,
              })
            }
          }
        } else if (
          (start.inner.inner !== null && end.inner.inner !== null) &&
          (start.inner.inner.inner === null && end.inner.inner.inner === null)
        ) {
          // 如果是选中若干个单元格
          const startCellPos = start.inner.inner.index
          const endCellPos = end.inner.inner.index
          for (let rowIndex = startRowPos; rowIndex <= endRowPos; rowIndex++) {
            const row = this.children[rowIndex]
            for (let cellIndex = startCellPos; cellIndex < endCellPos; cellIndex++) {
              const cell = row.children[cellIndex]
              res.push({
                x: this.x + row.x + cell.x,
                y: this.y + row.y + cell.y,
                width: cell.width,
                height: cell.height,
              })
            }
          }
        } else if (
          (start.inner.inner !== null && end.inner.inner !== null) &&
          (start.inner.inner.inner !== null && end.inner.inner.inner !== null)
        ) {
          // 选中单元格中的某段内容
          // 这个时候 start 的 cell index 和 end 的 cell index 肯定是一样的
          const cellPos = start.inner.inner.index
          const startCellContentPos = start.inner.inner.inner
          const endCellContentPos = end.inner.inner.inner
          const row = this.children[startRowPos]
          const cell = row.children[cellPos]
          const rects = cell.getSelectionRectangles(startCellContentPos, endCellContentPos, correctByPosY).map(rect => {
            return {
              x: rect.x + cell.x + row.x + this.x,
              y: rect.y + cell.y + row.y + this.y,
              width: rect.width,
              height: rect.height,
            }
          })
          res.push(...rects)
        }
        return res
      }
    }
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
