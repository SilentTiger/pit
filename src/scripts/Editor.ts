import EventEmitter from 'eventemitter3'
import throttle from 'lodash/throttle'
import Delta from 'quill-delta-enhanced'
import { EventName } from './Common/EnumEventName'
import ICanvasContext from './Common/ICanvasContext'
import IRange from './Common/IRange'
import { isPointInRectangle, compareDocPos } from './Common/util'
import Document from './DocStructure/Document'
import { HistoryStackController } from './Controller/HistoryStackController'
import editorConfig, { EditorConfig } from './IEditorConfig'
import WebCanvasContext from './WebCanvasContext'
import Op from 'quill-delta-enhanced/dist/Op'
import IFragmentTextAttributes from './DocStructure/FragmentTextAttributes'
import SelectionController from './Controller/SelectionController'
import TableController from './Controller/TableController'
import SearchController from './Controller/SearchController'
import ContentController from './Controller/ContentController'
import createToolbarInstance from './toolbar'
import { getPlatform } from './Platform'
import { ISearchResult } from './Common/ISearchResult'
import { EnumListType } from './DocStructure/EnumListStyle'

/**
 * 重绘类型
 */
enum RenderType {
  NoRender = 0b00,    // 不需要重绘
  FastRender = 0b01,  // 快速重绘
  Render = 0b10,      // 重拍并重绘
}

/**
 * 编辑器类
 */
export default class Editor {
  public em = new EventEmitter();
  public config: EditorConfig
  public scrollTop: number = 0;

  private delta: Delta = new Delta();
  public cvsOffsetX: number = 0;
  /**
   * 编辑器容器 DOM 元素
   */
  public container: HTMLDivElement
  private heightPlaceholderContainer: HTMLDivElement = document.createElement('div');
  private heightPlaceholder: HTMLDivElement = document.createElement('div');
  private divCursor: HTMLDivElement = document.createElement('div');
  private textInput: HTMLTextAreaElement = document.createElement('textarea');
  private toolbar = createToolbarInstance(document.querySelector('#toolbar') as HTMLDivElement)
  private composing: boolean = false; // 输入法输入过程中，CompositionStart 将这个变量标记为 true， CompositionEnd 将这个变量标记为 false
  /**
   * 编辑器画布 DOM 元素
   */
  private cvsDoc: HTMLCanvasElement = document.createElement('canvas');
  /**
   * 编辑器画布 context 对象
   */
  public ctx: ICanvasContext = new WebCanvasContext(
    this.cvsDoc.getContext('2d') as CanvasRenderingContext2D,
  );

  private doc: Document = new Document();

  private needRender: RenderType = RenderType.NoRender

  // 标记鼠标指针是否在文档区域内
  private isPointerHoverDoc: boolean = false;
  // 记录当前鼠标在文档的哪个位置
  private currentPointerScreenX: number = 0;
  private currentPointerScreenY: number = 0;

  private selectionController: SelectionController
  private tableController: TableController
  private searchController: SearchController
  private contentController: ContentController
  private historyStackController = new HistoryStackController();

  // 即将插入的内容的格式

  private setEditorHeight = throttle((newSize) => {
    this.heightPlaceholder.style.height = newSize.height + 'px'
    this.em.emit(EventName.EDITOR_CHANGE_SIZE, newSize)
  }, 100);

  private onDocumentFormatChange = throttle((format: { [key: string]: Set<any> }) => {
    this.em.emit(EventName.EDITOR_CHANGE_FORMAT, format)
  }, 100);

  private changeCursorStatus = (() => {
    let cursorVisible = false
    let blinkTimer: number
    const setCursorVisibility = (visibility: boolean) => {
      this.divCursor.style.opacity = visibility === true ? '1' : '0'
      cursorVisible = visibility
    }
    return (status: {
      visible?: boolean,
      color?: string,
      x?: number,
      y?: number,
      height?: number,
    }) => {
      if (status.color !== undefined) { this.divCursor.style.borderLeftColor = status.color }
      if (status.x !== undefined) {
        this.divCursor.style.left = status.x + this.cvsOffsetX + 'px'
        this.textInput.style.left = status.x + this.cvsOffsetX + 'px'
      }
      if (status.y !== undefined) {
        this.divCursor.style.top = status.y + 'px'
        this.textInput.style.top = status.y + 'px'
      }
      if (status.height !== undefined) {
        this.divCursor.style.height = status.height + 'px'
        this.textInput.style.height = status.height + 'px'
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
  })();

  /**
   * 编辑器构造函数
   * @param container 编辑器容器 DOM 元素
   * @param config 编辑器配置数据实例
   */
  constructor(container: HTMLDivElement, config: EditorConfig) {
    this.config = { ...editorConfig, ...config }
    this.container = container
    this.initDOM()
    this.selectionController = new SelectionController(this.doc)
    this.tableController = new TableController(this, this.doc)
    this.searchController = new SearchController(this.doc)
    this.contentController = new ContentController(this.doc, this.historyStackController, this.selectionController)

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
    this.delta = delta
    this.contentController.setInitDelta(delta)
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
    console.log('start composition')
    this.composing = true
    this.contentController.startComposition(this.selectionController.getSelection())
  }

  /**
   * 更新输入法输入的内容
   * @param content 输入法中最新的输入内容
   * @param attr 输入的格式
   */
  public updateComposition(event: Event) {
    console.log('update composition')
    this.contentController.updateComposition(this.selectionController.getSelection()[0].start, (event as CompositionEvent).data, {})
  }

  /**
   * 结束输入法输入
   * @param length 输入法输入内容的长度
   */
  public endComposition(event: Event) {
    console.log('end composition')
    this.composing = false
    this.contentController.endComposition((event as CompositionEvent).data)
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
    const res = this.searchController.search(keywords)
    if (res.length > 0) {
      const targetResult = res[0]
      this.scrollToViewPort(targetResult.rects[0].y)
    }
  }

  /**
   * 清除搜索
   */
  public clearSearch() {
    this.searchController.clearSearch()
  }

  /**
   * 选中下一个搜索结果
   */
  public nextSearchResult() {
    const nextRes = this.searchController.nextSearchResult()
    if (nextRes !== null) {
      this.scrollToViewPort(nextRes.res.rects[0].y)
      this.toolbar.setSearchResult(this.searchController.getSearchResult(), nextRes.index)
    }
  }

  /**
   * 选中上一个搜索结果
   */
  public prevSearchResult() {
    const prevRes = this.searchController.prevSearchResult()
    if (prevRes !== null) {
      this.scrollToViewPort(prevRes.res.rects[0].y)
      this.toolbar.setSearchResult(this.searchController.getSearchResult(), prevRes.index)
    }
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false) {
    const diff = this.searchController.replace(replaceWords, all)
    const newResult = this.searchController.getSearchResult()
    const newIndex = this.searchController.searchResultCurrentIndex
    if (newIndex !== undefined && newResult.length > 0) {
      this.scrollToViewPort(newResult[newIndex].rects[0].y)
    }
    this.pushDelta(diff)
  }

  /**
   * undo
   */
  public undo() {
    const undoDelta = this.historyStackController.undo()
    if (undoDelta) {
      this.doc.applyChanges(undoDelta)
      this.delta = this.delta.compose(undoDelta)
    }
  }

  /**
   * redo
   */
  public redo() {
    const redoDelta = this.historyStackController.redo()
    if (redoDelta) {
      this.doc.applyChanges(redoDelta)
      this.delta = this.delta.compose(redoDelta)
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
    this.searchController.em.addListener(EventName.SEARCH_NEED_DRAW, this.onSearchNeedDraw)
    this.searchController.em.addListener(EventName.SEARCH_RESULT_CHANGE, this.onSearchResultChange)

    this.doc.em.addListener('OPEN_LINK', this.openLink)

    this.selectionController.em.addListener(EventName.CHANGE_SELECTION, this.onSelectionChange)
  }

  /**
   * 绑定编辑文档所需的相关事件
   */
  private bindEditEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_LAYOUT, this.updateCursorStatus)
    this.historyStackController.em.addListener(EventName.HISTORY_STACK_CHANGE, (status) => {
      this.em.emit(EventName.EDITOR_CHANGE_HISTORY_STACK, status)
    })
    this.textInput.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.contentController.delete(true)
      } else if (event.keyCode === 37) {
        // todo
        // if (!this.composing && this.doc.selection) {
        //   const { index, length } = this.doc.selection
        //   let newIndex = length > 0 ? index : index - 1
        //   newIndex = Math.max(0, newIndex)
        //   this.doc.setSelection({ index: newIndex, length: 0 })
        // }
      } else if (event.keyCode === 39) {
        // todo
        // if (!this.composing && this.doc.selection) {
        //   const { index, length } = this.doc.selection
        //   let newIndex = length > 0 ? index + length : index + 1
        //   newIndex = Math.min(this.doc.length - 1, newIndex)
        //   this.doc.setSelection({ index: newIndex, length: 0 })
        // }
      } else if (event.keyCode === 38) {
        // const newX = this.doc.selectionRectangles[this.doc.selectionRectangles.length - 1].x
        // const newY = this.doc.selectionRectangles[this.doc.selectionRectangles.length - 1].y - 1
        // const docPos = this.doc.getDocumentPos(newX, newY)
        // TODO
        // this.doc.setSelection({ index: docPos, length: 0 }, true)
      } else if (event.keyCode === 40) {
        // const targetRect = this.doc.selectionRectangles[0]
        // const newX = targetRect.x
        // const newY = targetRect.y + targetRect.height + 1
        // const docPos = this.doc.getDocumentPos(newX, newY)
        // TODO
        // this.doc.setSelection({ index: docPos, length: 0 }, true)
      }
    })
    this.textInput.addEventListener('input', () => {
      if (!this.composing) {
        this.contentController.input(this.textInput.value)
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
  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.cvsOffsetX = ((this.config.containerWidth - this.config.canvasWidth) / 2)
    this.container.style.width = this.config.containerWidth + 'px'
    this.container.style.height = this.config.containerHeight + 'px'

    this.cvsDoc.id = 'cvsDoc'
    this.cvsDoc.style.width = this.config.canvasWidth + 'px'
    this.cvsDoc.style.height = this.config.containerHeight + 'px'
    this.cvsDoc.style.left = this.cvsOffsetX + 'px'

    const ratio = getPlatform().getPixelRatio(this.ctx)
    this.cvsDoc.width = this.config.canvasWidth * ratio
    this.cvsDoc.height = this.config.containerHeight * ratio
    if (ratio !== 1) { this.ctx.scale(ratio, ratio) }

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
      this.selectionController.startSelection(x, y)
      this.changeCursorStatus({
        visible: false,
      })
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
    this.selectionController.updateSelection(x, y)
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
    } else {
      if (this.isPointerHoverDoc) {
        this.doc.onPointerLeave()
        this.isPointerHoverDoc = false
      }
    }
  }

  private onMouseUp = (event: MouseEvent) => {
    document.removeEventListener('mouseup', this.onMouseUp, true)
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    this.selectionController.endSelection(x, y)

    this.doc.onPointerUp(x, y)
    const selection = this.selectionController.getSelection()
    if (selection.length === 1 && compareDocPos(selection[0].start, selection[0].end) === 0) {
      const scrollPos = this.heightPlaceholderContainer.scrollTop
      const rects = this.selectionController.getSelectionRectangles(selection)
      if (rects.length > 0) {
        this.changeCursorStatus({
          visible: true,
          x: rects[0].x,
          y: rects[0].y,
          height: rects[0].height,
        })
        this.textInput.focus()
        this.scrollTo(scrollPos)
      }
    } else if (selection.length > 0) {
      const rects = this.selectionController.getSelectionRectangles([{ start: selection[0].start, end: selection[0].start }])
      if (rects.length > 0) {
        this.changeCursorStatus({
          visible: false,
          x: rects[0].x,
          y: rects[0].y,
          height: rects[0].height,
        })
      }
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

  private calOffsetDocPos = (pageX: number, pageY: number): { x: number, y: number } => {
    return {
      x: pageX - this.container.offsetLeft - this.cvsOffsetX,
      y: pageY - this.container.offsetTop + this.scrollTop,
    }
  }

  // 用户操作工具栏控件设置格式
  private onToolbarSetFormat(data: { [key: string]: any }) {
    console.log('format ', data)
    this.contentController.format(data, this.selectionController.getSelection())
  }

  private onToolbarClearFormat() {
    console.log('clear format')
    this.contentController.clearFormat(this.selectionController.getSelection())
  }

  private onToolbarSetIndent(direction: boolean) {
    this.contentController.setIndent(direction, this.selectionController.getSelection())
  }

  private onSetQuoteBlock() {
    this.contentController.setQuoteBlock(this.selectionController.getSelection())
    this.startDrawing()
  }

  private onSetList(listType: EnumListType) {
    this.contentController.setList(listType, this.selectionController.getSelection())
    this.startDrawing()
  }

  private onSetParagraph() {
    this.contentController.setParagraph(this.selectionController.getSelection())
    this.startDrawing()
  }

  // 选区发生变化时要快速重绘
  private onSelectionChange = () => {
    this.startDrawing(true)
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
    const selection = this.selectionController.getSelection()
    if (selection && selection.length > 0) {
      format = this.contentController.getFormat(selection)
    }
    this.toolbar.setCurrentFormat(format)
  }

  // 更新光标状态
  private updateCursorStatus = () => {
    const selection = this.selectionController.getSelection()
    if (selection.length === 1 &&
      compareDocPos(selection[0].start, selection[0].end) === 0) {
      // 只有一个选区，而且选区的开始结束位置相同说明是光标模式
      const rect = this.selectionController.getSelectionRectangles(selection)
      this.changeCursorStatus({
        visible: true,
        x: rect[0].x,
        y: rect[0].y,
        height: rect[0].height,
      })
    }
  }

  private pushDelta(diff: Delta) {
    if (diff.ops.length > 0 && this.delta) {
      this.historyStackController.push({
        redo: diff,
        undo: diff.invert(this.delta),
      })
      this.delta = this.delta.compose(diff)
    }
  }

  private openLink = (link: string) => {
    window.open(link)
  }
}
