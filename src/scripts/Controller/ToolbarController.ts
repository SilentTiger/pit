import Document from '../DocStructure/Document'
import EventEmitter from 'eventemitter3'
import TableCell, { TableCellBubbleMessage } from '../DocStructure/TableCell'
import Editor from '../Editor'

enum BorderType {
  TOP,
  BOTTOM,
  LEFT,
  RIGHT
}

export default class ToolbarController {
  public em = new EventEmitter()
  private editor: Editor
  private doc: Document

  private cellTop = document.createElement('div')
  private cellBottom = document.createElement('div')
  private cellLeft = document.createElement('div')
  private cellRight = document.createElement('div')
  private rowResizeLine = document.createElement('div')
  private colResizeLine = document.createElement('div')

  private currentCell: TableCell | null = null
  private currentBorder: BorderType = BorderType.TOP
  private startMousePosX: number = 0
  private startMousePosY: number = 0
  private startLinePosX: number = 0
  private startLinePosY: number = 0

  constructor(editor: Editor, doc: Document) {
    this.editor = editor
    this.doc = doc
    this.initToolbarDom()
    this.initEventListener()
  }

  private initToolbarDom() {
    const heightPlaceholderContainer: HTMLDivElement | null = this.editor.container.querySelector('#heightPlaceholderContainer')
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
      const horizontalStyle = 'height:5px;cursor:row-resize;'
      const verticalStyle = 'width:5px;cursor:col-resize;'
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
      this.rowResizeLine.setAttribute('style', commonStyle + 'height: 3px;background-color:gray')
      this.colResizeLine.setAttribute('style', commonStyle + 'width: 3px;background-color:gray;')
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
    this.startMousePosY = event.pageY
    this.startMousePosX = event.pageX
    document.addEventListener('mousemove', this.onMouseMove, true)
    document.addEventListener('mouseup', this.onMouseUp, true)
    this.setResizeLinePos()

    this.doc.em.removeListener(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, this.onEnterCell)
    this.doc.em.removeListener(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, this.onLeaveCell)
  }

  private setResizeLinePos() {
    if (this.currentCell && this.currentCell?.parent?.parent) {
      const currentTable = this.currentCell.parent.parent
      const tableAbsPos = currentTable.getAbsolutePos()
      if (tableAbsPos) {
        this.rowResizeLine.style.left = this.editor.cvsOffsetX + tableAbsPos.x + 'px'
        this.colResizeLine.style.top = tableAbsPos.y + 'px'
      }
      this.rowResizeLine.style.width = currentTable.width + 'px'
      this.colResizeLine.style.height = currentTable.height + 'px'

      const cellAbsPos = this.currentCell.getAbsolutePos()
      if (cellAbsPos) {
        this.startLinePosY = cellAbsPos.y + (this.currentBorder === BorderType.BOTTOM ? this.currentCell.height : 0) - 2
        this.rowResizeLine.style.top = this.startLinePosY + 'px'
        this.startLinePosX = this.editor.cvsOffsetX + cellAbsPos.x + (this.currentBorder === BorderType.RIGHT ? this.currentCell.width : 0) - 2
        this.colResizeLine.style.left = this.startLinePosX + 'px'
      }
    }
  }

  private onEnterCell = (_: any, stack: any[]) => {
    const cell = stack[0] as TableCell
    const pos = cell.getAbsolutePos()
    if (pos) {
      this.cellTop.style.left = this.editor.cvsOffsetX + pos.x + 'px'
      this.cellTop.style.top = pos.y + 'px'
      this.cellTop.style.width = cell.width + 'px'
      this.cellBottom.style.left = this.editor.cvsOffsetX + pos.x + 'px'
      this.cellBottom.style.top = pos.y + cell.height - cell.paddingBottom + 'px'
      this.cellBottom.style.width = cell.width + 'px'

      this.cellLeft.style.left = this.editor.cvsOffsetX + pos.x + 'px'
      this.cellLeft.style.top = pos.y + cell.paddingTop + 'px'
      this.cellLeft.style.height = cell.height - cell.paddingTop - cell.paddingBottom + 'px'
      this.cellRight.style.left = this.editor.cvsOffsetX + pos.x + cell.width - cell.paddingLeft + 'px'
      this.cellRight.style.top = pos.y + cell.paddingTop + 'px'
      this.cellRight.style.height = cell.height - cell.paddingTop - cell.paddingBottom + 'px'

      this.cellTop.style.display = 'block'
      this.cellBottom.style.display = 'block'
      this.cellLeft.style.display = 'block'
      this.cellRight.style.display = 'block'

      this.currentCell = cell
    }
  }

  private onLeaveCell = () => {
    this.cellTop.style.display = 'none'
    this.cellBottom.style.display = 'none'
    this.cellLeft.style.display = 'none'
    this.cellRight.style.display = 'none'
    this.currentCell = null
  }

  private onMouseMove = (event: MouseEvent) => {
    if (this.currentBorder === BorderType.TOP || this.currentBorder === BorderType.BOTTOM) {
      this.rowResizeLine.style.top = this.startLinePosY + (event.pageY - this.startMousePosY) + 'px'
    } else {
      this.colResizeLine.style.left = this.startLinePosX + (event.pageX - this.startMousePosX) + 'px'
    }
  }

  private onMouseUp = () => {
    document.removeEventListener('mousemove', this.onMouseMove, true)
    document.removeEventListener('mouseup', this.onMouseUp, true)
    this.rowResizeLine.style.display = 'none'
    this.colResizeLine.style.display = 'none'
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, this.onEnterCell)
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, this.onLeaveCell)
  }
}
