import Document from '../DocStructure/Document'
import EventEmitter from 'eventemitter3'
import TableCell, { TableCellBubbleMessage } from '../DocStructure/TableCell'
import Editor from '../Editor'

export default class ToolbarController {
  public em = new EventEmitter()
  private editor: Editor
  private doc: Document

  private cellTop = document.createElement('div')
  private cellBottom = document.createElement('div')
  private cellLeft = document.createElement('div')
  private cellRight = document.createElement('div')
  constructor(editor: Editor, doc: Document) {
    this.editor = editor
    this.doc = doc
    this.initTableController()
  }

  private initTableController() {
    this.initToolbarDom()
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_ENTER_TABLE_CELL, (_: any, stack: any[]) => {
      console.log('show cell tools')
      const cell = stack[0] as TableCell
      console.log('pos:', cell.getAbsolutePos())
      const pos = cell.getAbsolutePos()
      if (pos) {
        this.cellTop.style.left = this.editor.cvsOffsetX + (pos.x - 3) + 'px'
        this.cellTop.style.top = (pos.y - 3) + 'px'
        this.cellTop.style.width = (cell.width + 6) + 'px'
        this.cellBottom.style.left = this.editor.cvsOffsetX + (pos.x - 3) + 'px'
        this.cellBottom.style.top = (pos.y + cell.height) + 'px'
        this.cellBottom.style.width = (cell.width + 6) + 'px'
        this.cellLeft.style.left = this.editor.cvsOffsetX + (pos.x - 3) + 'px'
        this.cellLeft.style.top = pos.y + 'px'
        this.cellLeft.style.height = cell.height + 'px'
        this.cellRight.style.left = this.editor.cvsOffsetX + (pos.x + cell.width) + 'px'
        this.cellRight.style.top = pos.y + 'px'
        this.cellRight.style.height = cell.height + 'px'

        this.cellTop.style.display = 'block'
        this.cellBottom.style.display = 'block'
        this.cellLeft.style.display = 'block'
        this.cellRight.style.display = 'block'
      }
    })
    this.doc.em.addListener(TableCellBubbleMessage.POINTER_LEAVE_TABLE_CELL, (_: any, stack: any[]) => {
      this.cellTop.style.display = 'none'
      this.cellBottom.style.display = 'none'
      this.cellLeft.style.display = 'none'
      this.cellRight.style.display = 'none'
    })
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
      const commonStyle = 'display:none;position:absolute;background-color:red;'
      const horizontalStyle = 'height:3px;cursor:row-resize;'
      const verticalStyle = 'width:3px;cursor:col-resize;'
      this.cellTop.setAttribute('style', commonStyle + horizontalStyle)
      this.cellBottom.setAttribute('style', commonStyle + horizontalStyle)
      this.cellLeft.setAttribute('style', commonStyle + verticalStyle)
      this.cellRight.setAttribute('style', commonStyle + verticalStyle)
      heightPlaceholderContainer.appendChild(this.cellTop)
      heightPlaceholderContainer.appendChild(this.cellBottom)
      heightPlaceholderContainer.appendChild(this.cellLeft)
      heightPlaceholderContainer.appendChild(this.cellRight)
    }
  }
}
