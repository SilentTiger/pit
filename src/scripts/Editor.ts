import * as EventEmitter from 'eventemitter3'
import throttle from 'lodash/throttle'
import Delta from 'quill-delta'
import { EventName } from './Common/EnumEventName'
import ICanvasContext from './Common/ICanvasContext'
import IRange from './Common/IRange'
import { ISearchResult } from './Common/ISearchResult'
import { getPixelRatio } from './Common/Platform'
import { convertFormatFromSets, isPointInRectangle } from './Common/util'
import Document from './DocStructure/Document'
import { EnumListType } from './DocStructure/EnumListStyle'
import { IFragmentOverwriteAttributes } from './DocStructure/FragmentOverwriteAttributes'
import { HistoryStack } from './HistoryStack'
import editorConfig, { EditorConfig } from './IEditorConfig'
import WebCanvasContext from './WebCanvasContext'

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

  public scrollTop: number = 0;

  private delta: Delta = new Delta();
  private cvsOffsetX: number = 0;
  /**
   * 编辑器容器 DOM 元素
   */
  private container: HTMLDivElement;
  private heightPlaceholderContainer: HTMLDivElement = document.createElement('div');
  private heightPlaceholder: HTMLDivElement = document.createElement('div');
  private selecting: boolean = false;
  private selectionStart: number = 0;
  private divCursor: HTMLDivElement = document.createElement('div');
  private textInput: HTMLTextAreaElement = document.createElement('textarea');
  private composing: boolean = false; // 输入法输入过程中，CompositionStart 将这个变量标记为 true， CompositionEnd 将这个变量标记为 false
  /**
   * 编辑器画布 DOM 元素
   */
  private cvsDoc: HTMLCanvasElement = document.createElement('canvas');
  private cvsCover: HTMLCanvasElement = document.createElement('canvas');
  /**
   * 编辑器画布 context 对象
   */
  private ctx: ICanvasContext = new WebCanvasContext(
    this.cvsDoc.getContext('2d') as CanvasRenderingContext2D,
    this.cvsCover.getContext('2d') as CanvasRenderingContext2D,
  );

  private doc: Document = new Document();
  private history = new HistoryStack();

  private needRender: RenderType = RenderType.NoRender

  private searchResults: ISearchResult[] = [];
  private searchResultCurrentIndex: number | undefined = undefined;

  // 标记鼠标指针是否在文档区域内
  private isPointerHoverDoc: boolean = false;
  // 记录当前鼠标在文档的哪个位置
  private currentPointerScreenX: number = 0;
  private currentPointerScreenY: number = 0;

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
    Object.assign(editorConfig, config)
    this.container = container
    this.initDOM()
    this.bindBasicEvents()
    this.bindReadEvents()
    if (editorConfig.canEdit) {
      this.bindEditEvents()
    }
  }

  /**
   * 通过 delta 初始化文档内容
   * @param delta change 数组
   */
  public readFromChanges(delta: Delta) {
    this.delta = delta
    this.doc.readFromChanges(delta)
    console.log('read finished', performance.now() - (window as any).start)
    this.startDrawing()
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param selection 选区
   */
  public format(attr: IFragmentOverwriteAttributes) {
    if (this.doc.selection) {
      const diff = this.doc.format(attr, this.doc.selection)
      this.pushDelta(diff)
    }
  }

  /**
   * 清除选区范围内容的格式
   * @param selection 需要清除格式的选区范围
   */
  public clearFormat(selection?: IRange) {
    const sel = selection || this.doc.selection
    if (sel) {
      const diff = this.doc.clearFormat(sel)
      this.pushDelta(diff)
    }
  }

  /**
   * 添加链接
   */
  public setLink(url: string) {
    if (this.doc.selection === null) return
    const linkStart = this.doc.selection.index
    let linkLength = this.doc.selection.length
    if (linkLength === 0) {
      // 如果没有选区就先插入一段文本
      this.doc.insertText(url, this.doc.selection)
      linkLength = url.length
    }
    this.doc.format({ link: url }, { index: linkStart, length: linkLength })
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean) {
    const selection = this.doc.selection
    if (selection) {
      const diff = this.doc.setIndent(increase, selection.index, selection.length)
      this.pushDelta(diff)
    }
  }

  /**
   * 设置引用块
   */
  public setQuoteBlock() {
    const selection = this.doc.selection
    if (selection) {
      const diff = this.doc.setQuoteBlock(selection.index, selection.length)
      this.pushDelta(diff)
    }
  }

  /**
   * 设置列表
   */
  public setList(listType: EnumListType) {
    const selection = this.doc.selection
    if (selection) {
      const diff = this.doc.setList(listType, selection.index, selection.length)
      this.pushDelta(diff)
    }
  }

  /**
   * 设置普通段落
   */
  public setParagraph() {
    const selection = this.doc.selection
    if (selection) {
      const diff = this.doc.setParagraph(selection.index, selection.length)
      this.pushDelta(diff)
    }
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
    this.doc.search(keywords)
    if (this.searchResults.length > 0) {
      const targetResult = this.searchResults[0]
      this.scrollToViewPort(targetResult.rects[0].y)
    }
  }

  /**
   * 清除搜索
   */
  public clearSearch() {
    this.doc.clearSearch()
  }

  /**
   * 选中下一个搜索结果
   */
  public nextSearchResult() {
    if (this.searchResultCurrentIndex !== undefined) {
      let newIndex = this.searchResultCurrentIndex + 1
      if (newIndex >= this.searchResults.length) {
        newIndex = 0
      }
      this.doc.setSearchResultCurrentIndex(newIndex)
      const targetResult = this.searchResults[newIndex]
      this.scrollToViewPort(targetResult.rects[0].y)
    }
  }

  /**
   * 选中上一个搜索结果
   */
  public prevSearchResult() {
    if (this.searchResultCurrentIndex !== undefined) {
      let newIndex = this.searchResultCurrentIndex - 1
      if (newIndex < 0) {
        newIndex = this.searchResults.length - 1
      }
      this.doc.setSearchResultCurrentIndex(newIndex)
      const targetResult = this.searchResults[newIndex]
      this.scrollToViewPort(targetResult.rects[0].y)
    }
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false) {
    const diff = this.doc.replace(replaceWords, all)
    this.pushDelta(diff)
  }

  /**
   * undo
   */
  public undo() {
    const undoDelta = this.history.undo()
    if (undoDelta) {
      this.doc.applyChanges(undoDelta)
      this.delta = this.delta.compose(undoDelta)
    }
  }

  /**
   * redo
   */
  public redo() {
    const redoDelta = this.history.redo()
    if (redoDelta) {
      this.doc.applyChanges(redoDelta)
      this.delta = this.delta.compose(redoDelta)
    }
  }

  /**
   * 把指定的绝对坐标滚动到可视区域
   */
  private scrollToViewPort(posY: number) {
    if (posY > this.scrollTop + editorConfig.containerHeight || posY < this.scrollTop) {
      const targetScrollTop = Math.floor(posY - editorConfig.containerHeight / 2)
      this.scrollTo(targetScrollTop)
    }
  }

  private bindBasicEvents() {
    document.addEventListener('mousemove', this.onMouseMove, true)
    document.addEventListener('mousedown', this.onMouseDown, true)
    document.addEventListener('mouseup', this.onMouseUp, true)
    document.addEventListener('click', this.onClick, true)
    this.heightPlaceholderContainer.addEventListener('scroll', this.onEditorScroll)
  }

  /**
   * 绑定阅读文档所需的相关事件
   */
  private bindReadEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SIZE, this.setEditorHeight)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SELECTION_RECTANGLE, this.onDocumentSelectionRectangleChange)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SELECTION, this.onDocumentSelectionChange)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_CONTENT, this.onDocumentContentChange)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_FORMAT, this.onDocumentFormatChange)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SEARCH_RESULT, this.onDocumentSearchResultChange)
  }

  /**
   * 绑定编辑文档所需的相关事件
   */
  private bindEditEvents() {
    this.history.em.addListener(EventName.HISTORY_STACK_CHANGE, (status) => {
      this.em.emit(EventName.EDITOR_CHANGE_HISTORY_STACK, status)
    })
    this.textInput.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.onBackSpace()
      } else if (event.keyCode === 37) {
        if (!this.composing && this.doc.selection) {
          const { index, length } = this.doc.selection
          let newIndex = length > 0 ? index : index - 1
          newIndex = Math.max(0, newIndex)
          this.doc.setSelection({ index: newIndex, length: 0 })
        }
      } else if (event.keyCode === 39) {
        if (!this.composing && this.doc.selection) {
          const { index, length } = this.doc.selection
          let newIndex = length > 0 ? index + length : index + 1
          newIndex = Math.min(this.doc.length - 1, newIndex)
          this.doc.setSelection({ index: newIndex, length: 0 })
        }
      } else if (event.keyCode === 38) {
        const newX = this.doc.selectionRectangles[this.doc.selectionRectangles.length - 1].x
        const newY = this.doc.selectionRectangles[this.doc.selectionRectangles.length - 1].y - 1
        const docPos = this.doc.getDocumentPos(newX, newY)
        this.doc.setSelection({ index: docPos, length: 0 }, true)
      } else if (event.keyCode === 40) {
        const targetRect = this.doc.selectionRectangles[0]
        const newX = targetRect.x
        const newY = targetRect.y + targetRect.height + 1
        const docPos = this.doc.getDocumentPos(newX, newY)
        this.doc.setSelection({ index: docPos, length: 0 }, true)
      }
    })
    this.textInput.addEventListener('input', () => {
      if (!this.composing) {
        this.onInput(this.textInput.value)
        this.textInput.value = ''
      }
    })
    this.textInput.addEventListener('compositionstart', () => {
      this.composing = true
      this.em.emit(EventName.EDITOR_COMPOSITION_START)
      if (this.doc.selection && this.doc.nextFormat) {
        const diff = this.doc.startComposition(this.doc.selection, convertFormatFromSets(this.doc.nextFormat))
        this.pushDelta(diff)
      }
    })
    this.textInput.addEventListener('compositionupdate', (event: Event) => {
      this.em.emit(EventName.EDITOR_COMPOSITION_UPDATE)
      if (this.doc.nextFormat) {
        this.doc.updateComposition((event as CompositionEvent).data, convertFormatFromSets(this.doc.nextFormat))
      }
    })
    this.textInput.addEventListener('compositionend', () => {
      this.em.emit(EventName.EDITOR_COMPOSITION_END)
      this.composing = false
      if (this.doc.nextFormat) {
        const diff = this.doc.endComposition(this.textInput.value.length)
        this.pushDelta(diff)
      }
      this.textInput.value = ''
    })
  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.cvsOffsetX = ((editorConfig.containerWidth - editorConfig.canvasWidth) / 2)
    this.container.style.width = editorConfig.containerWidth + 'px'
    this.container.style.height = editorConfig.containerHeight + 'px'

    this.cvsDoc.id = 'cvsDoc'
    this.cvsDoc.style.width = editorConfig.canvasWidth + 'px'
    this.cvsDoc.style.height = editorConfig.containerHeight + 'px'
    this.cvsDoc.style.left = this.cvsOffsetX + 'px'

    this.cvsCover.id = 'cvsCover'
    this.cvsCover.style.width = editorConfig.canvasWidth + 'px'
    this.cvsCover.style.height = editorConfig.containerHeight + 'px'
    this.cvsCover.style.left = this.cvsOffsetX + 'px'

    const ratio = getPixelRatio(this.ctx)
    this.cvsDoc.width = editorConfig.canvasWidth * ratio
    this.cvsDoc.height = editorConfig.containerHeight * ratio
    this.cvsCover.width = editorConfig.canvasWidth * ratio
    this.cvsCover.height = editorConfig.containerHeight * ratio
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
    this.container.appendChild(this.cvsCover)
    this.container.appendChild(this.heightPlaceholderContainer)
  }

  /**
   * 绘制文档内容
   */
  private render = () => {
    if (this.needRender === RenderType.FastRender) {
      this.doc.fastDraw(this.ctx, this.scrollTop, editorConfig.containerHeight)
    } else if (this.needRender === RenderType.Render) {
      this.doc.draw(this.ctx, this.scrollTop, editorConfig.containerHeight)
    }
    this.needRender = RenderType.NoRender
  }

  /**
   * 开始绘制任务
   * @param {boolean} fast 是否为快速绘制
   */
  private startDrawing(fast = false) {
    if (this.needRender === RenderType.NoRender) {
      requestAnimationFrame(this.render)
    }
    if (fast && this.needRender === RenderType.NoRender) {
      this.needRender = RenderType.FastRender
    } else {
      this.needRender = RenderType.Render
    }
  }

  private onEditorScroll = () => {
    this.scrollTop = this.heightPlaceholderContainer.scrollTop
    this.startDrawing(true)
  }

  private onMouseDown = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    const docRect = {
      x: 0,
      y: 0,
      width: editorConfig.canvasWidth,
      height: editorConfig.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      this.selectionStart = this.doc.getDocumentPos(x, y)
      this.startDrawing()
      this.selecting = true
    } else {
      this.selecting = false
    }
    this.startDrawing()
  }

  private onMouseMove = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    const childrenStack = this.doc.getChildrenStackByPos(x, y)
    // 设置鼠标指针样式
    this.heightPlaceholderContainer.style.cursor = childrenStack[childrenStack.length - 1].getCursorType()
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    if (this.selecting) {
      const selectionEnd = this.doc.getDocumentPos(x, y)
      const selectionLength = Math.abs(selectionEnd - this.selectionStart)
      // 这里要注意，如果 selectionLength > 0 就走普通的计算逻辑
      // 如果 selectionLength === 0，说明要进入光标模式，这时要计算光标的位置，必须要带入当前的 x,y 坐标
      this.doc.setSelection({
        index: Math.min(this.selectionStart, selectionEnd),
        length: selectionLength,
      }, selectionLength !== 0)
      if (selectionLength === 0) {
        // 这里用当前鼠标位置来手动计算
        this.doc.calSelectionRectangles(y)
      }
    }
    const docRect = {
      x: 0,
      y: 0,
      width: editorConfig.canvasWidth,
      height: editorConfig.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      if (!this.isPointerHoverDoc) {
        this.doc.onPointerEnter(x, y)
        this.isPointerHoverDoc = true
      }
      this.doc.onPointerMove(x, y)
    } else {
      if (this.isPointerHoverDoc) {
        this.doc.onPointerLeave()
        this.isPointerHoverDoc = false
      }
    }
    this.startDrawing()
  }

  private onMouseUp = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    if (this.selecting) {
      const selectionEnd = this.doc.getDocumentPos(x, y)
      const selectionLength = Math.abs(selectionEnd - this.selectionStart)
      // 这里要注意，如果 selectionLength > 0 就走普通的计算逻辑
      // 如果 selectionLength === 0，说明要进入光标模式，这时要计算光标的位置，必须要带入当前的 x,y 坐标
      this.doc.setSelection({
        index: Math.min(this.selectionStart, selectionEnd),
        length: selectionLength,
      }, selectionLength !== 0)
      if (selectionLength === 0) {
        // 这里用当前鼠标位置来手动计算
        this.doc.calSelectionRectangles(y)
      }
      if (this.doc.selection !== null) {
        this.textInput.focus()
      }
      this.selecting = false
    }
    this.doc.onPointerUp(x, y)
    this.startDrawing()
  }

  private onClick = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    const docRect = {
      x: 0,
      y: 0,
      width: editorConfig.canvasWidth,
      height: editorConfig.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      this.doc.onPointerTap(x, y)
    }
    this.startDrawing()
  }

  private calOffsetDocPos = (pageX: number, pageY: number): { x: number, y: number } => {
    return {
      x: pageX - this.container.offsetLeft - this.cvsOffsetX,
      y: pageY - this.container.offsetTop + this.scrollTop,
    }
  }

  private onDocumentSelectionChange = () => {
    this.startDrawing()
  }

  private onDocumentSelectionRectangleChange = () => {
    const selection = this.doc.selection
    if (selection !== null) {
      if (selection.length === 0) {
        this.changeCursorStatus({
          visible: true,
          y: this.doc.selectionRectangles[0].y,
          x: this.doc.selectionRectangles[0].x,
          height: this.doc.selectionRectangles[0].height,
        })
      } else {
        this.changeCursorStatus({ visible: false })
      }
      this.textInput.focus()
    }
  }

  private onDocumentContentChange = () => {
    this.startDrawing()
  }

  private onDocumentSearchResultChange = (results: ISearchResult[], currentIndex: number) => {
    this.searchResults = results
    this.searchResultCurrentIndex = currentIndex
    this.startDrawing()
    this.em.emit(EventName.EDITOR_CHANGE_SEARCH_RESULT, results, currentIndex)
  }

  private onBackSpace = () => {
    if (this.doc.selection) {
      const diff = this.doc.delete(this.doc.selection)
      this.pushDelta(diff)
      this.doc.setSelection({
        index: this.doc.selection.length > 0 ? this.doc.selection.index : this.doc.selection.index - 1,
        length: 0,
      }, false)
    }
  }

  private onInput = (content: string) => {
    if (this.doc.selection && this.doc.nextFormat) {
      const diff = this.doc.insertText(content, this.doc.selection, convertFormatFromSets(this.doc.nextFormat))
      this.pushDelta(diff)
      this.doc.setSelection({
        index: this.doc.selection.index + content.length,
        length: 0,
      }, false)
    }
  }

  private pushDelta(diff: Delta) {
    if (diff.ops.length > 0 && this.delta) {
      this.history.push({
        redo: diff,
        undo: diff.invert(this.delta),
      })
      this.delta = this.delta.compose(diff)
    }
  }
}
