import EventEmitter from 'eventemitter3'
import throttle from 'lodash/throttle'
import type Delta from 'quill-delta-enhanced'
import { EventName } from './Common/EnumEventName'
import type ICanvasContext from './Common/ICanvasContext'
import { isPointInRectangle, compareDocPos } from './Common/util'
import Document from './DocStructure/Document'
import { HistoryStackService } from './Service/HistoryStackService'
import type { EditorConfig } from './IEditorConfig'
import WebCanvasContext from './WebCanvasContext'
import SelectionService from './Service/SelectionService'
import TableController from './Controller/TableController'
import TableService from './Service/TableService'
import SearchService from './Service/SearchService'
import ContentService from './Service/ContentService'
import createToolbarInstance from './toolbar'
import { getPlatform } from './Platform'
import type { ISearchResult } from './Common/ISearchResult'
import type { EnumListType } from './DocStructure/EnumListStyle'
import QuoteBlockService from './Service/QuoteBlockService'
import ParagraphService from './Service/ParagraphService'
import ListService from './Service/ListService'
import ContentController from './Controller/InputController'

/**
 * 重绘类型
 */
enum RenderType {
  NoRender = 0b00, // 不需要重绘
  FastRender = 0b01, // 快速重绘
  Render = 0b10, // 重拍并重绘
}

/**
 * 编辑器类
 */
export default class Editor {
  public em = new EventEmitter()
  public config: EditorConfig
  public scrollTop = 0

  public cvsOffsetX = 0
  /**
   * 编辑器容器 DOM 元素
   */
  public container: HTMLDivElement
  public cvsDoc: HTMLCanvasElement = document.createElement('canvas')
  /**
   * 编辑器画布 context 对象
   */
  public ctx: ICanvasContext = new WebCanvasContext(this.cvsDoc.getContext('2d') as CanvasRenderingContext2D)

  private heightPlaceholderContainer: HTMLDivElement = document.createElement('div')
  private heightPlaceholder: HTMLDivElement = document.createElement('div')
  private divCursor: HTMLDivElement = document.createElement('div')
  private textInput: HTMLTextAreaElement = document.createElement('textarea')
  private toolbar = createToolbarInstance(document.querySelector('#toolbar') as HTMLDivElement)
  private composing = false // 输入法输入过程中，CompositionStart 将这个变量标记为 true， CompositionEnd 将这个变量标记为 false
  /**
   * 编辑器画布 DOM 元素
   */
  private doc: Document = new Document()
  private needRender: RenderType = RenderType.NoRender

  // 标记鼠标指针是否在文档区域内
  private isPointerHoverDoc = false
  // 记录当前鼠标在文档的哪个位置
  private currentPointerScreenX = 0
  private currentPointerScreenY = 0

  private selectionService: SelectionService
  private searchService: SearchService
  private contentService: ContentService
  private historyStackService: HistoryStackService
  private tableService: TableService
  private tableController: TableController
  private paragraphService: ParagraphService
  private quoteBlockService: QuoteBlockService
  private listService: ListService
  private contentController: ContentController

  // 即将插入的内容的格式

  private setEditorHeight = throttle((newSize) => {
    this.heightPlaceholder.style.height = `${newSize.height}px`
    this.em.emit(EventName.EDITOR_CHANGE_SIZE, newSize)
  }, 100)

  private onDocumentFormatChange = throttle((format: { [key: string]: Set<any> }) => {
    this.em.emit(EventName.EDITOR_CHANGE_FORMAT, format)
  }, 100)

  private changeCursorStatus = (() => {
    let cursorVisible = false
    let blinkTimer: number
    const setCursorVisibility = (visibility: boolean) => {
      this.divCursor.style.opacity = visibility === true ? '1' : '0'
      cursorVisible = visibility
    }
    return (status: { visible?: boolean; color?: string; x?: number; y?: number; height?: number }) => {
      if (status.color !== undefined) {
        this.divCursor.style.borderLeftColor = status.color
      }
      if (status.x !== undefined) {
        this.divCursor.style.left = `${status.x + this.cvsOffsetX}px`
        this.textInput.style.left = `${status.x + this.cvsOffsetX}px`
      }
      if (status.y !== undefined) {
        this.divCursor.style.top = `${status.y}px`
        this.textInput.style.top = `${status.y}px`
      }
      if (status.height !== undefined) {
        this.divCursor.style.height = `${status.height}px`
        this.textInput.style.height = `${status.height}px`
      }
      window.clearInterval(blinkTimer)
      if (status.visible === true) {
        blinkTimer = window.setInterval(() => {
          setCursorVisibility(!cursorVisible)
        }, 540)
      }
      if (status.visible !== undefined) {
        setCursorVisibility(status.visible)
      }
    }
  })()

  /**
   * 编辑器构造函数
   * @param container 编辑器容器 DOM 元素
   * @param config 编辑器配置数据实例
   */
  constructor(container: HTMLDivElement, config: EditorConfig) {
    this.config = { ...config }
    this.container = container
    this.initDOM()
    this.doc.setWidth(this.config.canvasWidth)
    this.selectionService = new SelectionService(this.doc)
    this.historyStackService = new HistoryStackService(this.doc)
    this.tableService = new TableService(this.doc, this.historyStackService)
    this.searchService = new SearchService(this.doc)
    this.contentService = new ContentService(this.doc, this.historyStackService, this.selectionService)
    this.paragraphService = new ParagraphService(this.doc, this.historyStackService, this.contentService)
    this.listService = new ListService(this.doc, this.historyStackService, this.contentService)
    this.quoteBlockService = new QuoteBlockService(
      this.doc,
      this.historyStackService,
      this.contentService,
      this.paragraphService,
    )
    this.tableController = new TableController(this, this.doc, this.contentService, this.tableService)
    this.contentController = new ContentController(this, this.doc, this.contentService)

    this.bindBasicEvents()
    this.bindReadEvents()
    if (this.config.canEdit) {
      this.bindEditEvents()
      this.bindToolbarEvents()
    }
  }

  /**
   * 通过 delta 初始化文档内容
   * @param delta change 数组
   */
  public readFromChanges(delta: Delta) {
    this.historyStackService.setInitDelta(delta)
    this.doc.readFromChanges(delta)
    console.log('read finished', performance.now() - (window as any).start)
    this.startDrawing()
  }

  /**
   * 在指定位置用输入法开始插入内容
   * @param selection 要开始输入法输入的选区范围
   * @param attr 输入的格式
   */
  public startComposition() {
    this.composing = true
    this.contentService.startComposition(this.selectionService.getSelection())
  }

  /**
   * 更新输入法输入的内容
   * @param content 输入法中最新的输入内容
   * @param attr 输入的格式
   */
  public updateComposition(event: Event) {
    this.contentService.updateComposition(
      this.selectionService.getSelection()[0].start,
      (event as CompositionEvent).data,
      {},
    )
  }

  /**
   * 结束输入法输入
   * @param length 输入法输入内容的长度
   */
  public endComposition(event: Event) {
    this.composing = false
    this.contentService.endComposition((event as CompositionEvent).data)
    this.textInput.value = ''
  }

  /**
   * 清除文档内容
   */
  public clearData() {
    // TODO
  }

  /**
   * 滚动可视区域到指定位置
   */
  public scrollTo(posY: number) {
    this.heightPlaceholderContainer.scrollTop = posY
  }

  /**
   * 搜索指定字符串
   */
  public search(keywords: string) {
    const res = this.searchService.search(keywords)
    if (res.length > 0) {
      const targetResult = res[0]
      this.scrollToViewPort(targetResult.rects[0].y)
    }
  }

  /**
   * 清除搜索
   */
  public clearSearch() {
    this.searchService.clearSearch()
  }

  /**
   * 选中下一个搜索结果
   */
  public nextSearchResult() {
    const nextRes = this.searchService.nextSearchResult()
    if (nextRes !== null) {
      this.scrollToViewPort(nextRes.res.rects[0].y)
      this.toolbar.setSearchResult(this.searchService.getSearchResult(), nextRes.index)
    }
  }

  /**
   * 选中上一个搜索结果
   */
  public prevSearchResult() {
    const prevRes = this.searchService.prevSearchResult()
    if (prevRes !== null) {
      this.scrollToViewPort(prevRes.res.rects[0].y)
      this.toolbar.setSearchResult(this.searchService.getSearchResult(), prevRes.index)
    }
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false) {
    const diff = this.searchService.replace(replaceWords, all)
    this.historyStackService.pushDiff(diff)
    const newResult = this.searchService.getSearchResult()
    const newIndex = this.searchService.searchResultCurrentIndex
    if (newIndex !== undefined && newResult.length > 0) {
      this.scrollToViewPort(newResult[newIndex].rects[0].y)
    }
  }

  /**
   * undo
   */
  public undo() {
    const undoDelta = this.historyStackService.undo()
    console.log('undo ', undoDelta?.ops)
    if (undoDelta) {
      this.contentService.applyChanges(undoDelta)
    }
  }

  /**
   * redo
   */
  public redo() {
    const redoDelta = this.historyStackService.redo()
    console.log('redo ', redoDelta?.ops)
    if (redoDelta) {
      this.contentService.applyChanges(redoDelta)
    }
  }

  /**
   * 开始绘制任务
   * @param {boolean} fast 是否为快速绘制
   */
  public startDrawing(fast = false) {
    if (this.needRender === RenderType.NoRender) {
      requestAnimationFrame(this.render)
      this.needRender = RenderType.FastRender
    }
    if (!fast) {
      this.needRender = RenderType.Render
    }
  }

  /**
   * 把指定的绝对坐标滚动到可视区域
   */
  private scrollToViewPort(posY: number) {
    if (posY > this.scrollTop + this.config.containerHeight || posY < this.scrollTop) {
      const targetScrollTop = Math.floor(posY - this.config.containerHeight / 2)
      this.scrollTo(targetScrollTop)
    }
  }

  private bindBasicEvents() {
    this.heightPlaceholder.addEventListener('mousedown', this.onMouseDown, true)
    document.addEventListener('mousemove', this.onMouseMove, true)
    document.addEventListener('click', this.onClick, true)
    this.heightPlaceholderContainer.addEventListener('scroll', this.onEditorScroll)
  }

  /**
   * 绑定阅读文档所需的相关事件
   */
  private bindReadEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SIZE, this.setEditorHeight)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_CONTENT, this.onDocumentContentChange)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_FORMAT, this.onDocumentFormatChange)

    this.doc.em.addListener(EventName.DOCUMENT_NEED_DRAW, this.onDocumentNeedDraw)
    this.searchService.addListener(EventName.SEARCH_NEED_DRAW, this.onSearchNeedDraw)
    this.searchService.addListener(EventName.SEARCH_RESULT_CHANGE, this.onSearchResultChange)

    this.doc.em.addListener('OPEN_LINK', this.openLink)

    this.selectionService.addListener(EventName.CHANGE_SELECTION, this.onSelectionChange)
  }

  /**
   * 绑定编辑文档所需的相关事件
   */
  private bindEditEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_LAYOUT, this.updateCursorStatus)
    this.historyStackService.addListener(
      EventName.HISTORY_STACK_CHANGE,
      this.toolbar.setRedoUndoStatus.bind(this.toolbar),
    )
    this.textInput.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.contentService.delete(true)
      } else if (event.key === 'ArrowUp') {
        this.selectionService.cursorMoveUp()
      } else if (event.key === 'ArrowDown') {
        this.selectionService.cursorMoveDown()
      } else if (event.key === 'ArrowLeft') {
        if (event.metaKey || event.ctrlKey) {
          this.selectionService.cursorMoveToLineStart()
        } else {
          this.selectionService.cursorMoveLeft()
        }
      } else if (event.key === 'ArrowRight') {
        if (event.metaKey || event.ctrlKey) {
          this.selectionService.cursorMoveToLineEnd()
        } else {
          this.selectionService.cursorMoveRight()
        }
      }
    })
    this.textInput.addEventListener('input', () => {
      if (!this.composing) {
        this.contentService.input(this.textInput.value)
        this.textInput.value = ''
      }
    })
    this.textInput.addEventListener('compositionstart', this.startComposition.bind(this))
    this.textInput.addEventListener('compositionupdate', this.updateComposition.bind(this))
    this.textInput.addEventListener('compositionend', this.endComposition.bind(this))
  }

  private bindToolbarEvents() {
    this.toolbar.$on('format', this.onToolbarSetFormat.bind(this))
    this.toolbar.$on('clearFormat', this.onToolbarClearFormat.bind(this))
    this.toolbar.$on('indent', this.onToolbarSetIndent.bind(this))
    this.toolbar.$on('search', this.search.bind(this))
    this.toolbar.$on('replace', this.replace.bind(this))
    this.toolbar.$on('clearSearch', this.clearSearch.bind(this))
    this.toolbar.$on('prevSearchResult', this.prevSearchResult.bind(this))
    this.toolbar.$on('nextSearchResult', this.nextSearchResult.bind(this))
    this.toolbar.$on('setQuoteBlock', this.onSetQuoteBlock.bind(this))
    this.toolbar.$on('setList', this.onSetList.bind(this))
    this.toolbar.$on('setParagraph', this.onSetParagraph.bind(this))
    this.toolbar.$on('insertImage', this.onInsertImage.bind(this))
    this.toolbar.$on('insertTable', this.onInsertTable.bind(this))
    this.toolbar.$on('redo', this.redo.bind(this))
    this.toolbar.$on('undo', this.undo.bind(this))
  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.cvsOffsetX = (this.config.containerWidth - this.config.canvasWidth) / 2
    this.container.style.width = `${this.config.containerWidth}px`
    this.container.style.height = `${this.config.containerHeight}px`

    this.cvsDoc.id = 'cvsDoc'
    this.cvsDoc.style.width = `${this.config.canvasWidth}px`
    this.cvsDoc.style.height = `${this.config.containerHeight}px`
    this.cvsDoc.style.left = `${this.cvsOffsetX}px`

    const ratio = getPlatform().getPixelRatio(this.ctx)
    this.cvsDoc.width = this.config.canvasWidth * ratio
    this.cvsDoc.height = this.config.containerHeight * ratio
    if (ratio !== 1) {
      this.ctx.scale(ratio, ratio)
    }

    this.heightPlaceholderContainer.id = 'heightPlaceholderContainer'
    this.heightPlaceholder.id = 'divHeightPlaceholder'

    this.divCursor = document.createElement('div')
    this.divCursor.id = 'divCursor'
    this.divCursor.tabIndex = -1

    this.textInput = document.createElement('textarea')
    this.textInput.id = 'textInput'
    this.textInput.tabIndex = -1
    this.textInput.autocomplete = 'off'
    this.textInput.autocapitalize = 'none'
    this.textInput.spellcheck = false

    this.heightPlaceholderContainer.appendChild(this.heightPlaceholder)
    this.heightPlaceholderContainer.appendChild(this.textInput)
    this.heightPlaceholderContainer.appendChild(this.divCursor)
    this.container.appendChild(this.cvsDoc)
    this.container.appendChild(this.heightPlaceholderContainer)
  }

  /**
   * 绘制文档内容
   */
  private render = () => {
    if (this.needRender === RenderType.FastRender) {
      this.doc.fastDraw(this.ctx, this.scrollTop, this.config.containerHeight)
    } else if (this.needRender === RenderType.Render) {
      this.doc.draw(this.ctx, this.scrollTop, this.config.containerHeight)
    }
    this.needRender = RenderType.NoRender
  }

  private onEditorScroll = () => {
    this.scrollTop = this.heightPlaceholderContainer.scrollTop
    this.startDrawing(true)
  }

  private onMouseDown = (event: MouseEvent) => {
    document.addEventListener('mouseup', this.onMouseUp, true)
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    const docRect = {
      x: 0,
      y: 0,
      width: this.config.canvasWidth,
      height: this.config.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      this.selectionService.startMouseSelection(x, y)
    }
    this.doc.onPointerDown(x, y)
  }

  private onMouseMove = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    const childrenStack = this.doc.getChildrenStackByPos(x, y)
    // 设置鼠标指针样式
    this.heightPlaceholderContainer.style.cursor = childrenStack[childrenStack.length - 1].getCursorType()
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    this.selectionService.updateMouseSelection(x, y)
    const docRect = {
      x: 0,
      y: 0,
      width: this.config.canvasWidth,
      height: this.config.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      if (!this.isPointerHoverDoc) {
        this.doc.onPointerEnter(x, y, childrenStack, 0)
        this.isPointerHoverDoc = true
      }
      this.doc.onPointerMove(x, y, childrenStack, 0)
    } else if (this.isPointerHoverDoc) {
      this.doc.onPointerLeave()
      this.isPointerHoverDoc = false
    }
  }

  private onMouseUp = (event: MouseEvent) => {
    document.removeEventListener('mouseup', this.onMouseUp, true)
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    this.selectionService.endMouseSelection(x, y)

    this.doc.onPointerUp(x, y)
    const selection = this.selectionService.getSelection()
    if (selection.length === 1 && compareDocPos(selection[0].start, selection[0].end) === 0) {
      const scrollPos = this.heightPlaceholderContainer.scrollTop
      const rects = this.selectionService.getSelectionRectangles()
      if (rects.length > 0) {
        this.textInput.focus()
        this.scrollTo(scrollPos)
      }
    } else if (selection.length > 0) {
      this.textInput.focus()
    }
  }

  private onClick = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    const docRect = {
      x: 0,
      y: 0,
      width: this.config.canvasWidth,
      height: this.config.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      this.doc.onPointerTap(x, y)
    }
  }

  private calOffsetDocPos = (pageX: number, pageY: number): { x: number; y: number } => {
    return {
      x: pageX - this.container.offsetLeft - this.cvsOffsetX,
      y: pageY - this.container.offsetTop + this.scrollTop,
    }
  }

  // 用户操作工具栏控件设置格式
  private onToolbarSetFormat(data: { [key: string]: any }) {
    console.log('format ', data)
    this.contentService.format(data, this.selectionService.getSelection())
  }

  private onToolbarClearFormat() {
    console.log('clear format')
    this.contentService.clearFormat(this.selectionService.getSelection())
  }

  private onToolbarSetIndent(direction: boolean) {
    this.contentService.setIndent(direction, this.selectionService.getSelection())
  }

  private onSetQuoteBlock() {
    this.quoteBlockService.setQuoteBlock(this.selectionService.getSelection())
    this.startDrawing()
  }

  private onSetList(listType: EnumListType) {
    this.listService.setList(listType, this.selectionService.getSelection())
    this.startDrawing()
  }

  private onSetParagraph() {
    this.paragraphService.setParagraph(this.selectionService.getSelection())
    this.startDrawing()
  }

  private onInsertImage(url: string) {
    this.contentController.insertImage(url)
  }

  private onInsertTable() {
    this.tableController.insertTable(this.selectionService.getSelection())
  }

  // 选区发生变化时要快速重绘
  private onSelectionChange = () => {
    this.startDrawing(true)
    this.updateCursorStatus()
    this.getCurrentFormat()
  }

  // 内容发生变化正常重绘
  private onDocumentContentChange = () => {
    this.startDrawing()
    this.getCurrentFormat()
  }

  // 文档需要快速重绘
  private onDocumentNeedDraw = () => {
    this.startDrawing(true)
  }

  // 因为搜索需要重绘
  private onSearchNeedDraw = () => {
    this.startDrawing(true)
  }

  private onSearchResultChange = (results: ISearchResult[], index: number) => {
    // 当搜索结果变化的时候要检测当前所有结果是不是在可见区域内
    this.startDrawing(true)
    this.toolbar.setSearchResult(results, index)
  }

  private getCurrentFormat = () => {
    let format = {}
    const selection = this.selectionService.getSelection()
    if (selection && selection.length > 0) {
      format = this.contentService.getFormat(selection)
    }
    this.toolbar.setCurrentFormat(format)
  }

  // 更新光标状态
  private updateCursorStatus = () => {
    const selection = this.selectionService.getSelection()
    if (selection.length === 1 && compareDocPos(selection[0].start, selection[0].end) === 0) {
      // 只有一个选区，而且选区的开始结束位置相同说明是光标模式
      const rect = this.selectionService.getSelectionRectangles()
      if (rect.length > 0) {
        this.changeCursorStatus({
          visible: true,
          x: rect[0].x,
          y: rect[0].y,
          height: rect[0].height,
        })
      }
    } else {
      this.changeCursorStatus({
        visible: false,
      })
    }
  }

  private openLink = (link: string) => {
    window.open(link)
  }
}
