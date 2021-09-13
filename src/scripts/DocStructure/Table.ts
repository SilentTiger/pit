import type ICanvasContext from '../Common/ICanvasContext'
import type IRectangle from '../Common/IRectangle'
import Block from './Block'
import type Op from 'quill-delta-enhanced/dist/Op'
import type { IRenderStructure } from '../Common/IRenderStructure'
import type { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import type { ISearchResult } from '../Common/ISearchResult'
import type LayoutFrame from './LayoutFrame'
import TableRow from './TableRow'
import type { ILinkedList } from '../Common/LinkedList'
import { ILinkedListDecorator } from '../Common/LinkedList'
import type { IPointerInteractive } from '../Common/IPointerInteractive'
import { IPointerInteractiveDecorator } from '../Common/IPointerInteractive'
import Delta from 'quill-delta-enhanced'
import type ITableAttributes from './TableAttributes'
import { TableDefaultAttributes } from './TableAttributes'
import {
  findHalf,
  isPointInRectangle,
  collectAttributes,
  getFormat,
  format,
  clearFormat,
  compareDocPos,
  findChildIndexInDocPos,
} from '../Common/util'
import TableCell from './TableCell'
import { EnumCursorType } from '../Common/EnumCursorType'
import type { DocPos } from '../Common/DocPos'
import type IFragmentTextAttributes from './FragmentTextAttributes'
import type ILayoutFrameAttributes from './LayoutFrameAttributes'
import type IRange from '../Common/IRange'
import type { IAttributable, IAttributes } from '../Common/IAttributable'
import { IAttributableDecorator } from '../Common/IAttributable'

import { IBubbleUpableDecorator } from '../Common/IBubbleUpable'
import type Fragment from './Fragment'
import editorConfig from '../IEditorConfig'

@IBubbleUpableDecorator
@ILinkedListDecorator
@IPointerInteractiveDecorator
@IAttributableDecorator
export default class Table extends Block implements ILinkedList<TableRow>, IAttributable {
  public static override readonly blockType: string = 'table'
  public static create(rowCount: number, colCount: number): Table {
    const table = new Table()
    for (let i = 0; i < rowCount; i++) {
      const row = new TableRow()
      for (let j = 0; j < colCount; j++) {
        const cell = TableCell.create()
        row.addLast(cell)
      }
      table.addLast(row)
    }
    const colWidth = Math.floor(editorConfig.canvasWidth / colCount)
    table.setAttributes({
      width: editorConfig.canvasWidth,
      colWidth: [...Array(colCount - 1).fill(colWidth), editorConfig.canvasWidth - colWidth * (colCount - 1)],
    })
    return table
  }

  public readonly needCorrectSelectionPos = true
  public children: TableRow[] = []
  public head: TableRow | null = null
  public tail: TableRow | null = null
  public attributes: ITableAttributes = { ...TableDefaultAttributes }
  public defaultAttributes: ITableAttributes = TableDefaultAttributes
  public overrideDefaultAttributes: Partial<ITableAttributes> | null = null
  public originalAttributes: Partial<ITableAttributes> | null = null
  public overrideAttributes: Partial<ITableAttributes> | null = null
  public override readonly length: number = 1
  public readonly canMerge: boolean = false
  public readonly canBeMerge: boolean = false

  public readFromOps(Ops: Op[]): void {
    // table 的 op 只会有一条，所以直接取第一条
    const delta = Ops[0].insert as Delta
    if (Ops[0]?.attributes) {
      this.setAttributes(Ops[0].attributes)
    }

    const rows = delta.ops.map((op) => {
      const row = new TableRow()
      row.readFromOps([op])
      return row
    })
    this.addAll(rows)
  }

  public layout() {
    if (!this.needLayout) {
      return
    }
    const currentColWidth = this.attributes.colWidth.map((width) => {
      return {
        width,
        span: 0,
      }
    })

    const rowSpanCell: Map<number, Array<TableCell>> = new Map()
    for (let rowIndex = 0, l = this.children.length; rowIndex < l; rowIndex++) {
      let rowMinContentHeight = 0
      const currentRow = this.children[rowIndex]
      currentRow.width = this.width

      const minusCol: number[] = Array(currentColWidth.length).fill(0)
      let cellIndex = 0
      let currentCellX = 0

      if (currentRow.children.length > 0) {
        for (let i = 0, l = currentColWidth.length; i < l; i++) {
          if (currentColWidth[i].span === 0) {
            const currentCell = currentRow.children[cellIndex]
            currentCell.GridRowPos = rowIndex
            currentCell.GridColPos = i
            currentCell.isLastCell = i + currentCell.attributes.colSpan === currentColWidth.length
            currentCell.isFirstCell = i === 0
            currentCell.isFirstLine = currentRow.prevSibling === null
            currentCell.isLastLine = rowIndex + currentCell.attributes.rowSpan === this.children.length

            currentCell.x = currentCellX
            let cellWidth = 0
            const widthIndex = i
            for (let j = 0; j < currentCell.attributes.colSpan; j++) {
              cellWidth += currentColWidth[widthIndex + j].width
              i++
            }
            i--

            currentCell.setWidth(cellWidth)
            currentCell.layout()

            if (currentCell.attributes.rowSpan > 1) {
              for (let j = 0; j < currentCell.attributes.colSpan; j++) {
                minusCol[widthIndex + j] += currentCell.attributes.rowSpan
              }
              const targetRowSpanCollection = rowSpanCell.get(rowIndex + currentCell.attributes.rowSpan - 1)
              if (!targetRowSpanCollection) {
                rowSpanCell.set(rowIndex + currentCell.attributes.rowSpan - 1, [currentCell])
              } else {
                targetRowSpanCollection.push(currentCell)
              }
            } else {
              rowMinContentHeight = Math.max(rowMinContentHeight, currentCell.contentHeight)
            }
            currentCellX += cellWidth
            cellIndex++
          } else {
            currentCellX += currentColWidth[i].width
          }
        }
      }

      currentColWidth.forEach((colWidthItem, index) => {
        colWidthItem.span = Math.max(0, colWidthItem.span - 1 + minusCol[index])
      })

      const spanCells = rowSpanCell.get(rowIndex)
      if (spanCells && spanCells.length > 0) {
        let offsetHeight = 0
        spanCells.forEach((cell) => {
          const cellOffsetHeight =
            cell.contentHeight -
            this.sumRowHeight(rowIndex - cell.attributes.rowSpan + 1, rowIndex - 1) -
            rowMinContentHeight
          if (cellOffsetHeight > offsetHeight) {
            offsetHeight = cellOffsetHeight
          }
        })

        if (offsetHeight > 0) {
          rowMinContentHeight += offsetHeight
        }
      }
      currentRow.setContentMinHeight(rowMinContentHeight)
      const rowHeight = Math.max(rowMinContentHeight, currentRow.attributes.height)
      currentRow.setHeight(rowHeight)
      for (let i = 0; i < currentRow.children.length; i++) {
        const cell = currentRow.children[i]
        if (cell.attributes.rowSpan === 1) {
          currentRow.children[i].setHeight(rowHeight)
        }
      }
      if (spanCells && spanCells.length > 0) {
        spanCells.forEach((cell) => {
          cell.setHeight(this.sumRowHeight(rowIndex - cell.attributes.rowSpan + 1, rowIndex))
        })
      }
    }

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

  public override getCursorType(): EnumCursorType {
    return EnumCursorType.RowResize
  }

  public search(keywords: string): ISearchResult[] {
    const res: ISearchResult[] = []
    for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
      const row = this.children[rowIndex]
      for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
        const cell = row.children[cellIndex]
        const cellSearchRes = cell.search(keywords)
        for (let resIndex = 0; resIndex < cellSearchRes.length; resIndex++) {
          const cellRes = cellSearchRes[resIndex]
          res.push({
            pos: {
              index: this.start,
              inner: {
                index: rowIndex,
                inner: {
                  index: cellIndex,
                  inner: cellRes.pos,
                },
              },
            },
            rects: cellRes.rects.map((rect) => {
              return {
                x: rect.x + cell.x + row.x + this.x,
                y: rect.y + cell.y + row.y + this.y,
                width: rect.width,
                height: rect.height,
              }
            }),
          })
        }
      }
    }
    return res
  }

  public override correctSelectionPos(
    start: DocPos | null,
    end: DocPos | null,
  ): Array<{ start: DocPos | null; end: DocPos | null }> {
    // 注意传入的参数 start 和 end 在 delta 层面都是没有进入 table 的
    let targetStart = start
    let targetEnd = end
    const res: Array<{ start: DocPos | null; end: DocPos | null }> = []
    // start、end 分为四种情况，要分别处理
    if (targetStart !== null && targetEnd !== null) {
      if (targetStart.inner === null && targetEnd.inner === null) {
        res.push({
          start: targetStart,
          end: targetEnd,
        })
      } else if (targetStart.inner === null && targetEnd.inner !== null) {
        // 说明从表格最前面开始，到指定行结束，选中所有相关行
        res.push({
          start: { index: 0, inner: null },
          end: { index: targetEnd.index + (targetEnd.inner ? 1 : 0), inner: null },
        })
      } else if (targetStart.inner !== null && targetEnd.inner !== null) {
        targetStart = targetStart.inner
        targetEnd = targetEnd.inner
        // start 和 end 都有可能只到 row 这一层或者只到 cell 这一层，或者进入到 cell 内部，所以这里逻辑比较复杂
        const startRowPos = targetStart ? targetStart.index : 0
        const endRowPos = targetEnd ? targetEnd.index : 0
        // 在 row 这一层，如果 start 或 end 没有继续深入，就直接选中所有涉及的 row
        if (targetStart.inner === null || targetEnd.inner === null) {
          if (compareDocPos(targetStart, targetEnd) === 0) {
            const pos = {
              index: 0,
              inner: { index: startRowPos, inner: { index: 0, inner: { index: 0, inner: null } } },
            }
            res.push({
              start: pos,
              end: pos,
            })
          } else {
            res.push({
              start: { index: 0, inner: { index: startRowPos, inner: null } },
              end: { index: 0, inner: { index: endRowPos + (targetEnd.inner ? 1 : 0), inner: null } },
            })
          }
        } else {
          // 进入这个分支，说明 start 和 end 都深入到了 cell 这一层
          const startRowData = targetStart.inner
          const endRowData = targetEnd.inner
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

            const startCellGridColPosTemp =
              startRow.children[Math.min(startCellPos, startRow.children.length - 1)].GridColPos
            const endCellGridColPosTemp = endRow.children[Math.min(endCellPos, endRow.children.length - 1)].GridColPos
            const startCellGridColPos = Math.min(startCellGridColPosTemp, endCellGridColPosTemp)
            const endCellGridColPos = Math.max(startCellGridColPosTemp, endCellGridColPosTemp)
            for (let i = startRowPos; i <= endRowPos; i++) {
              const currentRow = this.children[i]
              let startCellIndex: number | null = null
              let endCellIndex: number | null = null
              for (let j = 0; j < currentRow.children.length; j++) {
                const currentCell = currentRow.children[j]
                const currentCellGridColEndPos = currentCell.GridColPos + currentCell.attributes.colSpan - 1
                if (
                  (currentCell.GridColPos <= startCellGridColPos && startCellGridColPos <= currentCellGridColEndPos) ||
                  (currentCell.GridColPos <= endCellGridColPos && endCellGridColPos <= currentCellGridColEndPos) ||
                  (startCellGridColPos <= currentCell.GridColPos && currentCellGridColEndPos <= endCellGridColPos)
                ) {
                  if (startCellIndex === null) {
                    startCellIndex = j
                  }
                  endCellIndex = j
                } else if (startCellIndex !== null && endCellIndex !== null) {
                  break
                }
              }
              if (startCellIndex !== null && endCellIndex !== null) {
                res.push({
                  start: { index: 0, inner: { index: i, inner: { index: startCellIndex, inner: null } } },
                  end: {
                    index: 0,
                    inner: {
                      index: i,
                      inner: { index: endRowData?.inner ? endCellIndex + 1 : endCellIndex, inner: null },
                    },
                  },
                })
              }
            }
          } else {
            // 如果是同一行就看是直接选中涉及的单元格还是选中单元格中的内容
            const finalCellPos = endCellPos + (endRowData.inner ? 1 : 0)
            if (compareDocPos(targetStart, targetEnd) === 0 && targetStart.inner === null) {
              const pos = {
                index: 0,
                inner: { index: startRowPos, inner: { index: startCellPos, inner: { index: 0, inner: null } } },
              }
              res.push({
                start: pos,
                end: pos,
              })
            } else if (startCellPos !== endCellPos) {
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
                start: { index: 0, inner: targetStart },
                end: { index: 0, inner: targetEnd },
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
    } else if (targetEnd !== null) {
      // start 是 null，end 不是 null，说明选区是从当前表格之前开始的，则直接选中 end 所在的整行
      targetEnd = targetEnd.inner
      if (targetEnd !== null) {
        const rowPos = targetEnd.index
        const finalRowPos = targetEnd.inner ? rowPos + 1 : rowPos
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
    } else if (targetStart !== null) {
      targetStart = targetStart.inner
      // end 是 null，start 不是 null，说明选区是从当前表格开始，切结束位置在当前表格之后，则需要选中 start 所在的行
      if (targetStart !== null) {
        const rowPos = targetStart.index
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

    const targetX = x - this.x
    const targetY = y - this.y
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
        if (isPointInRectangle(targetX - row.x, targetY - row.y, cell)) {
          findRow = row
          findCell = cell
          break
        }
      }
      if (findCell) {
        break
      } else if (isPointInRectangle(targetX, targetY, { ...row, height: row.height })) {
        findRow = row
        break
      }
    }

    if (findCell && findRow) {
      const cellInnerPos = findCell.getDocumentPos(targetX - findRow.x - findCell.x, targetY - findRow.y - findCell.y)
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
        if (targetX >= cell.x + cell.width) {
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
        if (targetY >= row.y + row.height) {
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
        return [
          {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
          },
        ]
      } else if (end.index === 0 && end.inner !== null) {
        // 如果结束位置在表格中间
        // 就看结束位置在第几行，这种情况下只能只能整行选中
        let rowCount = end.inner.index
        if (end.inner.inner !== null) {
          rowCount += 1
        }
        if (rowCount === this.children.length) {
          return [
            {
              x: this.x,
              y: this.y,
              width: this.width,
              height: this.height,
            },
          ]
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
          return [
            {
              x: this.x,
              y: this.y,
              width: this.width,
              height: this.height,
            },
          ]
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
          start.inner.inner !== null &&
          end.inner.inner !== null &&
          start.inner.inner.inner === null &&
          end.inner.inner.inner === null
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
          start.inner.inner !== null &&
          end.inner.inner !== null &&
          start.inner.inner.inner !== null &&
          end.inner.inner.inner !== null
        ) {
          // 选中单元格中的某段内容
          // 这个时候 start 的 cell index 和 end 的 cell index 肯定是一样的
          const cellPos = start.inner.inner.index
          const startCellContentPos = start.inner.inner.inner
          const endCellContentPos = end.inner.inner.inner
          const row = this.children[startRowPos]
          const cell = row.children[cellPos]
          const rects = cell
            .getSelectionRectangles(startCellContentPos, endCellContentPos, correctByPosY)
            .map((rect) => {
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
      } else if (isPointInRectangle(x, y, row)) {
        findRow = row
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

  public toOp(withKey: boolean): Op[] {
    const rowOps = this.children.map((row) => row.toOp(withKey))
    const res: Op = {
      insert: new Delta(rowOps),
      attributes: { block: 'table' },
    }
    if (withKey) {
      res.key = this.id
    }

    if (this.originalAttributes && Object.keys(this.originalAttributes).length > 0) {
      Object.assign(res.attributes, this.originalAttributes)
    }
    return [res]
  }

  public toHtml(selection?: IRange | undefined): string {
    console.log('toHtml not implement')
    return ''
  }

  public toText(selection?: IRange | undefined): string {
    return ''
  }

  public insertText(content: string, pos: DocPos, attr?: Partial<IFragmentTextAttributes>): boolean {
    // 先看 pos 能不能落在某个单元格内，如果可以就调用这个单元格的 insertText 方法，否则就什么都不做并返回 false
    const posElement = this.getPosElement(pos)
    if (posElement.cell && posElement.posInCell) {
      posElement.cell.insertText(content, posElement.posInCell, attr)
      posElement.cell.setNeedToLayout()
      this.needLayout = true
      return true
    } else {
      return false
    }
  }
  public insertEnter(pos: DocPos, attr?: Partial<ILayoutFrameAttributes>): null {
    const posElement = this.getPosElement(pos)
    if (posElement.cell) {
      posElement.cell.insertEnter(posElement.posInCell!, attr)
    }
    this.needLayout = true
    return null
  }

  public insertBlock(block: Block, pos: DocPos): Block[] {
    const posElement = this.getPosElement(pos)
    if (posElement.cell) {
      posElement.cell.insertBlock(block, posElement.posInCell!)
    }
    this.needLayout = true
    return []
  }

  public insertFragment(frag: Fragment, pos: DocPos) {
    const posElement = this.getPosElement(pos)
    if (posElement.cell) {
      posElement.cell.insertFragment(frag, posElement.posInCell!)
    }
    this.needLayout = true
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

  public format(attr: Partial<IFragmentOverwriteAttributes>, range?: IRange): void {
    let rangeInRow: IRange | undefined
    if (range) {
      if (range.start.inner && range.end.inner) {
        // 如果 range 存在，range 的 start 的 inner 和 end 的 inner 一定不能是 null
        rangeInRow = { start: range.start.inner, end: range.end.inner }
      } else {
        return
      }
    }
    format<Table, TableRow>(this, attr, rangeInRow)
    this.needLayout = true
  }
  public clearFormat(range?: IRange): void {
    let rangeInRow: IRange | undefined
    if (range) {
      if (range.start.inner && range.end.inner) {
        // 如果 range 存在，range 的 start 的 inner 和 end 的 inner 一定不能是 null
        rangeInRow = { start: range.start.inner, end: range.end.inner }
      } else {
        return
      }
    }
    clearFormat<Table, TableRow>(this, rangeInRow)
    this.needLayout = true
  }

  public delete(range: IRange, forward: boolean) {
    const { start, end } = range

    // 如果 是光标模式，就调用光标所在单元格的 delete 方法
    // 如果是选择范围的模式，就要判断这个范围是不是落在同一个单元格内，如果是就还是调用单元格的 delete 方法，否则就删除范围内所有单元格的内容
    // 先看 pos 能不能落在某个单元格内，如果可以就调用这个单元格的 delete 方法，否则就什么都不做并返回 false
    const startPosElement = this.getPosElement(start)
    const endPosElement = this.getPosElement(end)

    // 分 同行同格，同行不同格，选中整行 3 种情况
    if (startPosElement.row === endPosElement.row && startPosElement.cell !== null && endPosElement.cell === null) {
      // 选中整行，清空这些行中的内容
      startPosElement.row?.children.forEach((c) => c.clearContent())
    } else if (startPosElement.cell === endPosElement.cell && startPosElement.cell !== null) {
      // 如果删除区域在同一个单元格内走 DocContent 的删除逻辑
      const rangeInRow = { start: start.inner as DocPos, end: end.inner as DocPos }
      const rangeInCell = { start: rangeInRow.start.inner as DocPos, end: rangeInRow.end.inner as DocPos }
      const rangeInDocContent = { start: rangeInCell.start.inner as DocPos, end: rangeInCell.end.inner as DocPos }
      const targetCell = endPosElement.cell as TableCell
      targetCell.delete([rangeInDocContent], forward)
    } else {
      // 如果删除区域垮单元格，则清空所有区域内单元格的内容
      let currentCell = startPosElement.cell
      while (currentCell) {
        currentCell.clearContent()
        if (currentCell !== endPosElement.cell?.prevSibling) {
          currentCell = currentCell.nextSibling
        } else {
          break
        }
      }
    }

    this.needLayout = true
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
      this.setAttributes({ colWidth: width })
    } else if (typeof width === 'number' && typeof index === 'number') {
      const oldColWidth = this.originalAttributes?.colWidth || []
      oldColWidth[index] = width
      this.setAttributes({ colWidth: [...oldColWidth] })
    }
  }

  public override draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    for (let index = 0; index < this.children.length; index++) {
      const row = this.children[index]
      // row 里面可能有单元格会跨行，所以就算 row 超过了屏幕上沿也要绘制
      if (row.y < viewHeight) {
        row.draw(ctx, this.x + x, this.y + y, viewHeight - row.y)
        row.drawBorder(ctx, this.x + x, this.y + y)
      }
    }

    // 绘制表格外边框
    const borderX = findHalf(this.x + x, 1)
    const borderY = findHalf(this.y + y, 1)
    ctx.strokeRect(borderX, borderY, Math.floor(this.width - (borderX - this.x - x)), Math.round(this.height))

    super.draw(ctx, x, y, viewHeight)
  }

  /**
   * 判断选区中的单元格能不能合并
   */
  public canMergeCells(selection: IRange[]): { cornerCell: TableCell; cells: TableCell[] } | null {
    // 判断依据是选中的单元格的 GridRowPos 和 GridColPos 能不能构成一个矩形区域
    const selectedCells: TableCell[] = []
    for (let index = 0; index < selection.length; index++) {
      const range = selection[index]
      selectedCells.push(...this.getSelectedCell(range))
    }
    if (selectedCells.length <= 1) {
      return null
    }
    // 判断选中的单元格是否组成一个矩形，如果是就可以合并
    let cornerCell: TableCell = selectedCells[0]
    const cellMatrix: number[][] = []
    selectedCells.forEach((cell) => {
      for (let rowIndex = cell.GridRowPos; rowIndex < cell.GridRowPos + cell.attributes.rowSpan; rowIndex++) {
        for (let cellIndex = cell.GridColPos; cellIndex < cell.GridColPos + cell.attributes.colSpan; cellIndex++) {
          cellMatrix[rowIndex] = cellMatrix[rowIndex] ?? []
          cellMatrix[rowIndex][cellIndex] = 1
          // 同时找出最左上角的 cell
          if (
            cornerCell.GridRowPos > cell.GridRowPos ||
            (cornerCell.GridRowPos === cell.GridRowPos && cornerCell.GridColPos > cell.GridColPos)
          ) {
            cornerCell = cell
          }
        }
      }
    })
    let firstRow: Array<undefined | number> | null = null

    for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
      if (firstRow === null) {
        if (Array.isArray(cellMatrix[rowIndex])) {
          firstRow = cellMatrix[rowIndex]
        }
        continue
      }

      const row = cellMatrix[rowIndex]
      let match = row.length === firstRow.length
      if (!match) {
        return null
      }
      for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
        match = match && row[cellIndex] === firstRow[cellIndex]
        if (!match) {
          break
        }
      }
      if (!match) {
        return null
      }
    }

    return { cornerCell, cells: selectedCells }
  }

  /**
   * 合并单元格
   */
  public mergeCells(selection: IRange[]): boolean {
    // 先获取所有选中的单元格，判断这些单元格能不能合并
    const data = this.canMergeCells(selection)
    let newRowSpan = 0
    let newColSpan = 0
    if (data) {
      const { cornerCell, cells } = data
      for (let index = 0; index < cells.length; index++) {
        const cell = cells[index]
        if (cell !== cornerCell) {
          newRowSpan = Math.max(newRowSpan, cell.GridRowPos + cell.attributes.rowSpan - cornerCell.GridRowPos)
          newColSpan = Math.max(newColSpan, cell.GridColPos + cell.attributes.colSpan - cornerCell.GridColPos)
          cell.parent?.remove(cell)
        }
      }
      cornerCell.setAttributes({ rowSpan: newRowSpan, colSpan: newColSpan })
      this.needLayout = true
      cornerCell.setNeedToLayout()
      return true
    } else {
      return false
    }
  }

  /**
   * 判断选区中的单元格能不能取消合并
   */
  public canUnmergeCells(selection: IRange[]): TableCell | null {
    // 判断依据是选中的单元格只有一个，且该单元格是一个合并的单元格
    let targetCell: TableCell | undefined | null
    for (let index = 0; index < selection.length; index++) {
      const range = selection[index]
      const elementAtPosStart = this.getPosElement(range.start)
      const elementAtPosEnd = this.getPosElement(range.end)
      if (targetCell === undefined) {
        targetCell = elementAtPosStart.cell
      }
      if (elementAtPosStart.cell === null || targetCell !== elementAtPosStart.cell) {
        return null
      }
      if (elementAtPosEnd.cell === null || targetCell !== elementAtPosEnd.cell) {
        return null
      }
    }
    return targetCell!.attributes.colSpan > 1 || targetCell!.attributes.rowSpan > 1 ? targetCell! : null
  }

  /**
   * 取消合并单元格
   */
  public unmergeCells(selection: IRange[]): boolean {
    const targetCell = this.canUnmergeCells(selection)
    if (!targetCell) {
      return false
    } else {
      // 把所有内容都放到 target cell 范围最左上角的单元格中
      const rowStartIndex = targetCell.GridRowPos
      const rowEndIndex = rowStartIndex + targetCell.attributes.rowSpan
      const gridColPosStart = targetCell.GridColPos
      const gridColPosEnd = gridColPosStart + targetCell.attributes.colSpan
      for (let rowIndex = rowStartIndex; rowIndex < rowEndIndex; rowIndex++) {
        const currentRow = this.children[rowIndex]
        for (let gridColPos = gridColPosStart; gridColPos < gridColPosEnd; gridColPos++) {
          if (rowIndex === rowStartIndex && gridColPos === gridColPosStart) {
            targetCell.setAttributes({ colSpan: 1, rowSpan: 1 })
            continue
          }
          // 创建一个空 TableCell 并插入当前行的指定位置
          const cell = TableCell.create()
          currentRow.splice(currentRow.head ? Math.max(0, gridColPos - currentRow.head.GridColPos) : 0, 0, [cell])
        }
      }
      this.needLayout = true
      return true
    }
  }

  public getSelectedCell(range: IRange): TableCell[] {
    const elementAtPosStart = this.getPosElement(range.start)
    const elementAtPosEnd = this.getPosElement(range.end)
    // 这里 elementAtPosStart 有三种情况，row === null、cell === null、posInCell === null
    if (
      elementAtPosStart.row === null &&
      elementAtPosEnd.row === null &&
      range.start.index === 0 &&
      range.end.index === 1
    ) {
      // 选中整个表格
      return this.children.reduce((allCells: TableCell[], row) => {
        allCells.push(...row.children)
        return allCells
      }, [])
    } else if (elementAtPosStart.cell === null && elementAtPosEnd.cell === null) {
      // 选中了若干行
      const res: TableCell[] = []
      let currentRow = elementAtPosStart.row
      while (currentRow) {
        res.push(...currentRow.children)
        if (currentRow.nextSibling === elementAtPosEnd.row) {
          break
        }
        currentRow = currentRow.nextSibling
      }
      return res
    } else if (elementAtPosStart.posInCell === null && elementAtPosEnd.posInCell === null) {
      // 选中了行中的若干单元格
      const res: TableCell[] = []
      let currentCell = elementAtPosStart.cell
      while (currentCell) {
        res.push(currentCell)
        if (currentCell.nextSibling === elementAtPosEnd.cell) {
          break
        }
        currentCell = currentCell.nextSibling
      }
      return res
    }
    return []
  }

  public createSelf(): Table {
    return new Table()
  }

  // #region IBubbleUpable methods
  public bubbleUp(type: string, data: any, stack?: any[]): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  public setBubbleHandler(handler: ((type: string, data: any, stack?: any[]) => void) | null): void {
    throw new Error('this method should implemented in IBubbleUpableDecorator')
  }
  // #endregion

  // #region override IDocPosOperator methods
  public firstPos(): DocPos {
    return { index: 0, inner: { index: 0, inner: { index: 0, inner: this.children[0].children[0].firstPos() } } }
  }
  public lastPos(): DocPos {
    // 最后一行不一定有 cell
    let res: DocPos | null = null
    let rowRetain = 0
    let cellRetain = 0
    for (let rowIndex = this.children.length - 1; rowIndex >= 0; rowIndex--) {
      const row = this.children[rowIndex]
      if (row.tail) {
        res = row.tail.lastPos()
        rowRetain = rowIndex
        cellRetain = row.children.length - 1
        break
      }
    }
    if (res) {
      return { index: 0, inner: { index: rowRetain, inner: { index: cellRetain, inner: res } } }
    } else {
      throw new Error('table should not be empty.')
    }
  }
  public nextPos(pos: DocPos): DocPos | null {
    let res: DocPos | null = null
    let targetRowIndex = 0
    let targetCellIndex = 0
    const rowPos = pos.inner
    if (rowPos) {
      targetRowIndex = findChildIndexInDocPos(rowPos.index, this.children)
      if (targetRowIndex >= 0) {
        const cellPos = rowPos.inner
        if (cellPos) {
          const targetRow = this.children[targetRowIndex]
          targetCellIndex = findChildIndexInDocPos(cellPos.index, targetRow.children)
          if (targetCellIndex >= 0) {
            const targetCell = targetRow.children[targetCellIndex]
            const docContentPos = cellPos.inner
            if (docContentPos) {
              res = targetCell.nextPos(docContentPos)
            }
            if (!res && targetCell.nextSibling) {
              res = targetCell.nextSibling.firstPos()
              targetCellIndex++
            }
          }
          if (!res && targetRow.nextSibling) {
            let currentRow: TableRow | null = targetRow.nextSibling
            while (currentRow) {
              targetRowIndex++
              if (currentRow.children.length > 0) {
                res = currentRow.children[0].firstPos()
                targetCellIndex = 0
                break
              } else {
                currentRow = currentRow.nextSibling
              }
            }
          }
        }
      }
    }
    return res
      ? {
          index: 0,
          inner: { index: targetRowIndex, inner: { index: targetCellIndex, inner: res } },
        }
      : null
  }
  public prevPos(pos: DocPos): DocPos | null {
    let res: DocPos | null = null
    let targetRowIndex = 0
    let targetCellIndex = 0
    const rowPos = pos.inner
    if (rowPos) {
      targetRowIndex = findChildIndexInDocPos(rowPos.index, this.children)
      if (targetRowIndex >= 0) {
        const cellPos = rowPos.inner
        if (cellPos) {
          const targetRow = this.children[targetRowIndex]
          targetCellIndex = findChildIndexInDocPos(cellPos.index, targetRow.children)
          if (targetCellIndex >= 0) {
            const targetCell = targetRow.children[targetCellIndex]
            const docContentPos = cellPos.inner
            if (docContentPos) {
              res = targetCell.prevPos(docContentPos)
            }
            if (!res && targetCell.prevSibling) {
              res = targetCell.prevSibling.lastPos()
              targetCellIndex--
            }
          }
          if (!res && targetRow.prevSibling) {
            let currentRow: TableRow | null = targetRow.prevSibling
            while (currentRow) {
              targetRowIndex--
              if (currentRow.children.length > 0) {
                res = currentRow.children[currentRow.children.length - 1].lastPos()
                targetCellIndex = targetRow.prevSibling.children.length - 1
                break
              } else {
                currentRow = currentRow.prevSibling
              }
            }
          }
        }
      }
    }
    return res
      ? {
          index: 0,
          inner: { index: targetRowIndex, inner: { index: targetCellIndex, inner: res } },
        }
      : null
  }
  public firstLinePos(x: number): DocPos | null {
    const targetRow = this.children[0]
    const xPosInRow = x - targetRow.x
    const res = targetRow.firstLinePos(xPosInRow)
    return res
      ? {
          index: 0,
          inner: { index: 0, inner: res },
        }
      : null
  }
  public lastLinePos(x: number): DocPos | null {
    let targetRowIndex = 0
    let targetRow: TableRow | null = null
    for (let rowIndex = 0; rowIndex < this.children.length; rowIndex++) {
      const row = this.children[rowIndex]
      if (row.children.length > 0) {
        targetRow = row
        targetRowIndex = rowIndex
      }
    }
    if (targetRow) {
      const xPosInRow = x - targetRow.x
      const res = targetRow.lastLinePos(xPosInRow)
      return res
        ? {
            index: 0,
            inner: { index: targetRowIndex, inner: res },
          }
        : null
    }
    return null
  }
  public nextLinePos(pos: DocPos, x: number): DocPos | null {
    let res: DocPos | null = null
    const rowPos = pos.inner
    let targetRowIndex = 0
    let targetCellIndex = 0
    if (rowPos) {
      targetRowIndex = rowPos.index
      const targetRow = this.children[targetRowIndex]
      const xPosInRow = x - targetRow.x
      if (targetRow) {
        const cellPos = rowPos.inner
        if (cellPos) {
          targetCellIndex = cellPos.index
          const targetCell = targetRow.children[targetCellIndex]
          if (targetCell && cellPos.inner) {
            const xPosInCell = xPosInRow - targetCell.x
            const resInCell = targetCell.nextLinePos(cellPos.inner, xPosInCell)
            if (resInCell) {
              res = { index: targetCellIndex, inner: resInCell }
            }
          }
          if (!res && targetRow.nextSibling) {
            let currentRow: TableRow | null = targetRow.nextSibling
            while (currentRow) {
              targetRowIndex++
              if (currentRow.children.length > 0) {
                res = currentRow.firstLinePos(xPosInRow)
                break
              } else {
                currentRow = currentRow.nextSibling
              }
            }
          }
        }
      }
    }
    return res
      ? {
          index: 0,
          inner: { index: targetRowIndex, inner: res },
        }
      : null
  }
  public prevLinePos(pos: DocPos, x: number): DocPos | null {
    console.log('x', x)
    let res: DocPos | null = null
    const rowPos = pos.inner
    let targetRowIndex = 0
    let targetCellIndex = 0
    if (rowPos) {
      targetRowIndex = rowPos.index
      const targetRow = this.children[targetRowIndex]
      if (targetRow) {
        const cellPos = rowPos.inner
        if (cellPos) {
          targetCellIndex = cellPos.index
          const targetCell = targetRow.children[targetCellIndex]
          if (targetCell && cellPos.inner) {
            const xPosInCell = x - targetRow.x - targetCell.x
            const resInCell = targetCell.prevLinePos(cellPos.inner, xPosInCell)
            if (resInCell) {
              res = { index: targetCellIndex, inner: resInCell }
            }
          }
          if (!res && targetRow.prevSibling) {
            let currentRow: TableRow | null = targetRow.prevSibling
            while (currentRow) {
              targetRowIndex--
              if (currentRow.children.length > 0) {
                res = currentRow.lastLinePos(x - currentRow.x)
                break
              } else {
                currentRow = currentRow.prevSibling
              }
            }
          }
        }
      }
    }
    return res
      ? {
          index: 0,
          inner: { index: targetRowIndex, inner: res },
        }
      : null
  }
  public lineStartPos(pos: DocPos, y: number): DocPos | null {
    let res: DocPos | null = null
    const rowPos = pos.inner
    let targetRowIndex = 0
    let targetCellIndex = 0
    if (rowPos) {
      targetRowIndex = rowPos.index
      const targetRow = this.children[targetRowIndex]
      const yPosInRow = y - targetRow.y
      if (targetRow) {
        const cellPos = rowPos.inner
        if (cellPos) {
          targetCellIndex = cellPos.index
          const targetCell = targetRow.children[targetCellIndex]
          if (targetCell && cellPos.inner) {
            const yPosInCell = yPosInRow - targetCell.y
            res = targetCell.lineStartPos(cellPos.inner, yPosInCell)
          }
        }
      }
    }
    return res
      ? {
          index: 0,
          inner: { index: targetRowIndex, inner: { index: targetCellIndex, inner: res } },
        }
      : null
  }
  public lineEndPos(pos: DocPos, y: number): DocPos | null {
    let res: DocPos | null = null
    const rowPos = pos.inner
    let targetRowIndex = 0
    let targetCellIndex = 0
    if (rowPos) {
      targetRowIndex = rowPos.index
      const targetRow = this.children[targetRowIndex]
      const yPosInRow = y - targetRow.y
      if (targetRow) {
        const cellPos = rowPos.inner
        if (cellPos) {
          targetCellIndex = cellPos.index
          const targetCell = targetRow.children[targetCellIndex]
          if (targetCell && cellPos.inner) {
            const yPosInCell = yPosInRow - targetCell.y
            res = targetCell.lineEndPos(cellPos.inner, yPosInCell)
          }
        }
      }
    }
    return res
      ? {
          index: 0,
          inner: { index: targetRowIndex, inner: { index: targetCellIndex, inner: res } },
        }
      : null
  }
  // #endregion

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
  public afterAdd(nodes: TableRow[]): void {
    nodes.forEach((node) => {
      node.setBubbleHandler(this.bubbleUp.bind(this))
    })
  }
  public afterRemove(nodes: TableRow[]): void {
    nodes.forEach((node) => {
      node.setBubbleHandler(null)
    })
  }
  public addLast(node: TableRow): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addAfter(node: TableRow, target: TableRow): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addBefore(node: TableRow, target: TableRow): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addAtIndex(node: TableRow, index: number): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public addAll(nodes: TableRow[]): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public removeAll(): TableRow[] {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public remove(node: TableRow): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public removeAllFrom(node: TableRow): TableRow[] {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public splice(start: number, deleteCount: number, nodes?: TableRow[] | undefined): TableRow[] {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  public findIndex(node: TableRow): void {
    throw new Error('this method should be implemented in ILinkedListDecorator')
  }
  // #endregion

  // #region override IAttributable method
  public setOverrideDefaultAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  public setOverrideAttributes(attr: IAttributes | null): void {
    throw new Error('Method not implemented.')
  }
  public setAttributes(attr: IAttributes | null | undefined): void {
    throw new Error('Method not implemented.')
  }
  public compileAttributes(): void {
    throw new Error('Method not implemented.')
  }
  // #endregion

  private sumRowHeight(startIndex: number, endIndex: number): number {
    let sum = 0
    for (let index = startIndex; index <= endIndex; index++) {
      sum += this.children[index].height
    }
    return sum
  }

  private getPosElement(
    pos: DocPos,
    direction: 'left' | 'right' = 'right',
  ): { row: TableRow | null; cell: TableCell | null; posInCell: DocPos | null } {
    const res: { row: TableRow | null; cell: TableCell | null; posInCell: DocPos | null } = {
      row: null,
      cell: null,
      posInCell: null,
    }
    const tableInnerPos = pos.inner
    if (!tableInnerPos) {
      return res
    }

    const rowIndex = tableInnerPos.index
    if (rowIndex >= this.children.length) {
      return res
    }
    res.row = this.children[rowIndex]

    const rowInnerPos = tableInnerPos.inner
    if (!rowInnerPos) {
      return res
    }

    const cellIndex = rowInnerPos.index
    if (cellIndex >= res.row.children.length) {
      return res
    }
    res.cell = res.row.children[cellIndex]

    const cellInnerPos = rowInnerPos.inner
    if (!cellInnerPos) {
      return res
    }
    res.posInCell = cellInnerPos

    return res
  }

  private getWholeRowAttributes(row: TableRow, res: { [key: string]: Set<any> }) {
    for (let i = 0; i < row.children.length; i++) {
      const cell = row?.children[i]
      collectAttributes(
        cell.getFormat([{ start: { index: 0, inner: null }, end: { index: cell.length, inner: null } }]),
        res,
      )
      collectAttributes(cell.attributes, res)
    }
  }
}
