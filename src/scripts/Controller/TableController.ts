import Document from '../DocStructure/Document'
import TableCell, { TableCellBubbleMessage } from '../DocStructure/TableCell'
import Editor from '../Editor'
import Table from '../DocStructure/Table'
import TableRow from '../DocStructure/TableRow'
import { EventName } from '../Common/EnumEventName'
import Controller from './Controller'
import TableService from '../Service/TableService'

enum BorderType {
  TOP,
  BOTTOM,
  LEFT,
  RIGHT,
}

const MIN_COL_WIDTH = 20
export default class TableController extends Controller {
  private tableService: TableService
  private cellTop = document.createElement('div')
  private cellBottom = document.createElement('div')
  private cellLeft = document.createElement('div')
  private cellRight = document.createElement('div')
  private rowResizeLine = document.createElement('div')
  private colResizeLine = document.createElement('div')

  private currentTable: Table | null = null
  private currentRow: TableRow | null = null
  private currentCell: TableCell | null = null
  private currentBorder: BorderType = BorderType.TOP
  private startMousePosX = 0
  private startMousePosY = 0
  private startLinePosX = 0
  private startLinePosY = 0
  private startColWidth: number[] = []
  private startRowHeight: number[] = []
  private startTableWidth = 0

  constructor(editor: Editor, doc: Document, service: TableService) {
    super(editor, doc)
    this.tableService = service
    this.initToolbarDom()
    this.initEventListener()
  }

  private initToolbarDom() {
    const heightPlaceholderContainer: HTMLDivElement | null =
      this.editor.container.querySelector('#heightPlaceholderContainer')
    if (heightPlaceholderContainer) {
      this.cellTop.id = 'cellTop'
      this.cellBottom.id = 'cellBottom'
      this.cellLeft.id = 'cellLeft'
      this.cellRight.id = 'cellRight'
      this.cellTop.tabIndex = -1
      this.cellBottom.tabIndex = -1
      this.cellLeft.tabIndex = -1
      this.cellRight.tabIndex = -1
      const commonStyle = 'display:none;position:absolute;outline:none;user-select:none;'
      const horizontalStyle = 'height:6px;cursor:row-resize;'
      const verticalStyle = 'width:6px;cursor:col-resize;'
      this.cellTop.setAttribute('style', commonStyle + horizontalStyle)
      this.cellBottom.setAttribute('style', commonStyle + horizontalStyle)
      this.cellLeft.setAttribute('style', commonStyle + verticalStyle)
      this.cellRight.setAttribute('style', commonStyle + verticalStyle)
      heightPlaceholderContainer.appendChild(this.cellTop)
      heightPlaceholderContainer.appendChild(this.cellBottom)
      heightPlaceholderContainer.appendChild(this.cellLeft)
      heightPlaceholderContainer.appendChild(this.cellRight)

      this.rowResizeLine.id = 'tableRowResizeLine'
      this.rowResizeLine.tabIndex = -1
      this.colResizeLine.id = 'tableColResizeLine'
      this.colResizeLine.tabIndex = -1
      this.rowResizeLine.setAttribute('style', `${commonStyle}height: 3px;background-color:gray`)
      this.colResizeLine.setAttribute('style', `${commonStyle}width: 3px;background-color:gray;`)
      heightPlaceholderContainer.appendChild(this.rowResizeLine)
      heightPlaceholderContainer.appendChild(this.colResizeLine)
    }
  }

  private initEventListener() {
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, this.onEnterCell)
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, this.onLeaveCell)

    this.cellTop.addEventListener('mousedown', (event) => {
      this.currentBorder = BorderType.TOP
      this.startDrag(event)
      this.rowResizeLine.style.display = 'block'
    })
    this.cellBottom.addEventListener('mousedown', (event) => {
      this.currentBorder = BorderType.BOTTOM
      this.startDrag(event)
      this.rowResizeLine.style.display = 'block'
    })
    this.cellLeft.addEventListener('mousedown', (event) => {
      this.currentBorder = BorderType.LEFT
      this.startDrag(event)
      this.colResizeLine.style.display = 'block'
    })
    this.cellRight.addEventListener('mousedown', (event) => {
      this.currentBorder = BorderType.RIGHT
      this.startDrag(event)
      this.colResizeLine.style.display = 'block'
    })
  }

  private startDrag(event: MouseEvent) {
    if (!this.currentCell || !this.currentTable) {
      return
    }
    this.startMousePosY = event.pageY
    this.startMousePosX = event.pageX
    document.addEventListener('mousemove', this.onMouseMove, true)
    document.addEventListener('mouseup', this.onMouseUp, true)
    this.setResizeLinePos()
    this.startColWidth = [...this.currentTable.attributes.colWidth]
    this.startRowHeight = this.currentTable.children.map((row) => row.height)
    this.startTableWidth = this.currentTable.width

    this.doc.em.removeListener(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, this.onEnterCell)
    this.doc.em.removeListener(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, this.onLeaveCell)
    if (this.currentTable) {
      this.tableService.startModify(this.currentTable)
    }
  }

  private setResizeLinePos() {
    if (this.currentCell?.parent?.parent) {
      const currentTable = this.currentCell.parent.parent
      const tableAbsPos = currentTable.getAbsolutePos()
      if (tableAbsPos) {
        this.rowResizeLine.style.left = `${this.editor.cvsOffsetX + tableAbsPos.x}px`
        this.colResizeLine.style.top = `${tableAbsPos.y}px`
      }
      this.rowResizeLine.style.width = `${currentTable.width}px`
      this.colResizeLine.style.height = `${currentTable.height}px`

      const cellAbsPos = this.currentCell.getAbsolutePos()
      if (cellAbsPos) {
        this.startLinePosY = cellAbsPos.y + (this.currentBorder === BorderType.BOTTOM ? this.currentCell.height : 0) - 2
        this.rowResizeLine.style.top = `${this.startLinePosY}px`
        this.startLinePosX =
          this.editor.cvsOffsetX +
          cellAbsPos.x +
          (this.currentBorder === BorderType.RIGHT ? this.currentCell.width : 0) -
          2
        this.colResizeLine.style.left = `${this.startLinePosX}px`
      }
    }
  }

  private onEnterCell = (_: any, stack: any[]) => {
    const cell = stack[0] as TableCell
    const pos = cell.getAbsolutePos()
    if (pos) {
      if (cell.GridRowPos > 0) {
        // 如果不是第一行的单元格才显示上边界的 dom
        this.cellTop.style.left = `${this.editor.cvsOffsetX + pos.x}px`
        this.cellTop.style.top = `${pos.y}px`
        this.cellTop.style.width = `${cell.width}px`
        this.cellTop.style.display = 'block'
      }

      this.cellBottom.style.left = `${this.editor.cvsOffsetX + pos.x}px`
      this.cellBottom.style.top = `${pos.y + cell.height - cell.paddingBottom}px`
      this.cellBottom.style.width = `${cell.width}px`
      this.cellBottom.style.display = 'block'

      if (cell.GridColPos > 0) {
        this.cellLeft.style.left = `${this.editor.cvsOffsetX + pos.x}px`
        this.cellLeft.style.top = `${pos.y + cell.paddingTop}px`
        this.cellLeft.style.height = `${cell.height - cell.paddingTop - cell.paddingBottom}px`
        this.cellLeft.style.display = 'block'
      }

      this.cellRight.style.left = `${this.editor.cvsOffsetX + pos.x + cell.width - cell.paddingLeft}px`
      this.cellRight.style.top = `${pos.y + cell.paddingTop}px`
      this.cellRight.style.height = `${cell.height - cell.paddingTop - cell.paddingBottom}px`
      this.cellRight.style.display = 'block'

      this.currentCell = cell
      if (cell.parent) {
        this.currentRow = cell.parent
        if (cell.parent.parent) {
          this.currentTable = cell.parent.parent
        }
      }
    }
  }

  private onLeaveCell = () => {
    this.cellTop.style.display = 'none'
    this.cellBottom.style.display = 'none'
    this.cellLeft.style.display = 'none'
    this.cellRight.style.display = 'none'
    this.currentCell = null
    this.currentRow = null
    this.currentTable = null
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.currentCell || !this.currentTable) {
      return
    }
    if (this.currentBorder === BorderType.TOP || this.currentBorder === BorderType.BOTTOM) {
      const moveOffset = event.pageY - this.startMousePosY
      // 表格上边框不能被拖动
      // 表格的下边框拖动会改变表格高度，以及最下边一行的高度
      // 除最上和最下边框外，其他横向的边框上下拖动时同时修改边框上下两行的高度，保持两者高度和不变
      // 但此时还要注意行高要足以放下所涉及的单元格的 contentHeight
      // 同时注意每一行不能小于最小高度

      const targetRow = this.currentBorder === BorderType.TOP ? this.currentRow?.prevSibling : this.currentRow
      const targetRowPos =
        this.currentCell.GridRowPos +
        this.currentCell.attributes.rowSpan -
        1 +
        (this.currentBorder === BorderType.TOP ? -1 : 0)
      if (targetRow) {
        const newHeight = this.startRowHeight[targetRowPos] + moveOffset
        if (newHeight > targetRow.contentMinHeight) {
          this.tableService.updateModifyRowHeight(targetRow, newHeight)
          this.rowResizeLine.style.top = `${this.startLinePosY + moveOffset}px`
        } else {
          this.tableService.updateModifyRowHeight(targetRow, 0)
        }
        this.currentTable.needLayout = true
        this.doc.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
      }
    } else {
      const moveOffset = event.pageX - this.startMousePosX
      // 表格左边框不能被拖动
      // 表格的右边框拖动会改变表格宽度，以及最右边一列的宽度
      // 除最左和最右边框外，其他纵向的边框左右拖动时同时修改边框左右两列的宽度，保持两者宽度和不变
      // 同时注意每一列不能小于最小宽度
      if (
        this.currentBorder === BorderType.RIGHT &&
        this.currentCell.GridColPos + this.currentCell.attributes.colSpan - 1 ===
          this.currentTable.attributes.colWidth.length - 1
      ) {
        const newColWidth = this.startColWidth[this.startColWidth.length - 1] + moveOffset
        const newTableWidth = this.startTableWidth + moveOffset
        if (newColWidth <= MIN_COL_WIDTH || newTableWidth > this.doc.width) {
          return
        }
        this.tableService.updateLastColumnWidth(this.currentTable, newColWidth, newTableWidth)
        this.doc.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
        this.colResizeLine.style.left = `${this.startLinePosX + (event.pageX - this.startMousePosX)}px`
        this.colResizeLine.style.height = `${this.currentTable.height}px`
      } else {
        // 进入这个分支说明是拖动表格中间的纵向边框
        const leftColIndex =
          this.currentBorder === BorderType.LEFT
            ? this.currentCell.GridColPos - 1
            : this.currentCell.GridColPos + this.currentCell.attributes.colSpan - 1
        const rightColIndex = leftColIndex + 1
        const newLeftColWidth = this.startColWidth[leftColIndex] + moveOffset
        const newRightColWidth = this.startColWidth[rightColIndex] - moveOffset
        if (newLeftColWidth >= MIN_COL_WIDTH && newRightColWidth >= MIN_COL_WIDTH) {
          this.tableService.updateModifyColumnWidth(
            this.currentTable,
            leftColIndex,
            newLeftColWidth,
            rightColIndex,
            newRightColWidth,
          )
          this.doc.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
          this.colResizeLine.style.left = `${this.startLinePosX + (event.pageX - this.startMousePosX)}px`
          this.colResizeLine.style.height = `${this.currentTable.height}px`
        }
      }
    }
  }

  private onMouseUp = (event: MouseEvent) => {
    document.removeEventListener('mousemove', this.onMouseMove, true)
    document.removeEventListener('mouseup', this.onMouseUp, true)
    this.rowResizeLine.style.display = 'none'
    this.colResizeLine.style.display = 'none'
    this.startColWidth.length = 0
    this.startRowHeight.length = 0
    this.startTableWidth = 0
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, this.onEnterCell)
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, this.onLeaveCell)
    if (this.currentTable) {
      this.tableService.endModify(this.currentTable)
    }
    if (this.currentBorder === BorderType.TOP || this.currentBorder === BorderType.BOTTOM) {
      this.rowResizeLine.style.top = `${this.startLinePosY + (event.pageY - this.startMousePosY)}px`
    } else {
      // todo
    }
  }
}
