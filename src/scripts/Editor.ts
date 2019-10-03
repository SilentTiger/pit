import * as EventEmitter from 'eventemitter3';
import { throttle } from "lodash";
import Delta from 'quill-delta';
import { EventName } from "./Common/EnumEventName";
import ICanvasContext from './Common/ICanvasContext';
import IRange from './Common/IRange';
import { getPixelRatio } from "./Common/Platform";
import { convertFormatFromSets } from './Common/util';
import Document from './DocStructure/Document';
import { EnumListType } from './DocStructure/EnumListStyle';
import { IFragmentOverwriteAttributes } from './DocStructure/FragmentOverwriteAttributes';
import editorConfig, { EditorConfig } from "./IEditorConfig";
import WebCanvasContext from "./WebCanvasContext";

/**
 * 编辑器类
 */
export default class Editor {
  public em = new EventEmitter();

  public scrollTop: number = 0;

  private cvsOffsetX: number = 0;
  /**
   * 编辑器容器 DOM 元素
   */
  private container: HTMLDivElement;
  private heightPlaceholderContainer: HTMLDivElement = document.createElement('div');
  private heightPlaceholder: HTMLDivElement = document.createElement('div');
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

  private needRender: boolean = false;

  private setEditorHeight = throttle((newSize) => {
    this.heightPlaceholder.style.height = newSize.height + 'px';
    this.em.emit(EventName.EDITOR_CHANGE_SIZE, newSize);
  }, 100);

  private onDocumentFormatChange = throttle((format: { [key: string]: Set<any> }) => {
    this.em.emit(EventName.EDITOR_CHANGE_FORMAT, format);
  }, 100);

  private changeCursorStatus = (() => {
    let cursorVisible = false;
    let blinkTimer: number;
    const setCursorVisibility = (visibility: boolean) => {
      this.divCursor.style.opacity = visibility === true ? '1' : '0';
      cursorVisible = visibility;
    };
    return (status: {
      visible?: boolean,
      color?: string,
      x?: number,
      y?: number,
      height?: number,
    }) => {
      if (status.color !== undefined) { this.divCursor.style.borderLeftColor = status.color; }
      if (status.x !== undefined) {
        this.divCursor.style.left = status.x + this.cvsOffsetX + 'px';
        this.textInput.style.left = status.x + this.cvsOffsetX + 'px';
      }
      if (status.y !== undefined) {
        this.divCursor.style.top = status.y + 'px';
        this.textInput.style.top = status.y + 'px';
      }
      if (status.height !== undefined) {
        this.divCursor.style.height = status.height + 'px';
        this.textInput.style.height = status.height + 'px';
      }
      window.clearInterval(blinkTimer);
      if (status.visible === true) {
        blinkTimer = window.setInterval(() => {
          setCursorVisibility(!cursorVisible);
        }, 540);
      }
      if (status.visible !== undefined) {
        setCursorVisibility(status.visible);
      }
    };
  })();

  /**
   * 编辑器构造函数
   * @param container 编辑器容器 DOM 元素
   * @param config 编辑器配置数据实例
   */
  constructor(container: HTMLDivElement, config: EditorConfig) {
    Object.assign(editorConfig, config);
    this.container = container;
    this.initDOM();
    this.bindReadEvents();
    this.bindEditEvents();
  }

  /**
   * 通过 delta 初始化文档内容
   * @param delta change 数组
   */
  public readFromChanges(delta: Delta) {
    this.doc.readFromChanges(delta);
    console.log('read finished', performance.now() - (window as any).start);
    this.startDrawing();
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param selection 选区
   */
  public format(attr: IFragmentOverwriteAttributes) {
    if (this.doc.selection) {
      this.doc.format(attr, this.doc.selection);
    }
  }

  /**
   * 清除选区范围内容的格式
   * @param selection 需要清除格式的选区范围
   */
  public clearFormat(selection?: IRange) {
    const sel = selection || this.doc.selection;
    if (sel) {
      this.doc.clearFormat(sel);
    }
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean) {
    const selection = this.doc.selection;
    if (selection) {
      this.doc.setIndent(increase, selection.index, selection.length);
    }
  }

  /**
   * 设置引用块
   */
  public setQuoteBlock() {
    const selection = this.doc.selection;
    if (selection) {
      this.doc.setQuoteBlock(selection.index, selection.length);
    }
  }

  /**
   * 设置列表
   */
  public setList(listType: EnumListType) {
    const selection = this.doc.selection;
    if (selection) {
      this.doc.setList(listType, selection.index, selection.length);
    }
  }

  /**
   * 设置普通段落
   */
  public setParagraph() {
    const selection = this.doc.selection;
    if (selection) {
      this.doc.setParagraph(selection.index, selection.length);
    }
  }

  /**
   * 清除文档内容
   */
  public clearData() {
    // TODO
  }

  public scrollTo() {
    // TODO
  }

  /**
   * 绑定阅读文档所需的相关事件
   */
  private bindReadEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SIZE, this.setEditorHeight);
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SELECTION_RECTANGLE, this.onDocumentSelectionRectangleChange);
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SELECTION, this.onDocumentSelectionChange);
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_CONTENT, this.onDocumentContentChange);
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_FORMAT, this.onDocumentFormatChange);
    this.heightPlaceholderContainer.addEventListener('scroll', this.onEditorScroll);

    this.heightPlaceholder.addEventListener('mousedown', this.onMouseDown);
  }

  /**
   * 绑定编辑文档所需的相关事件
   */
  private bindEditEvents() {
    this.textInput.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.onBackSpace();
      } else if (event.keyCode === 37) {
        if (!this.composing && this.doc.selection) {
          const {index, length} = this.doc.selection;
          let newIndex = length > 0 ? index : index - 1;
          newIndex = Math.max(0, newIndex);
          this.doc.setSelection({index: newIndex, length: 0});
        }
      } else if (event.keyCode === 39) {
        if (!this.composing && this.doc.selection) {
          const {index, length} = this.doc.selection;
          let newIndex = length > 0 ? index + length : index + 1;
          newIndex = Math.min(this.doc.length - 1, newIndex);
          this.doc.setSelection({index: newIndex, length: 0});
        }
      }
    });
    this.textInput.addEventListener('input', () => {
      if (!this.composing) {
        this.onInput(this.textInput.value);
        this.textInput.value = '';
      }
    });
    this.textInput.addEventListener('compositionstart', (event) => {
      this.composing = true;
      this.em.emit(EventName.EDITOR_COMPOSITION_START);
      if (this.doc.selection && this.doc.nextFormat) {
        this.doc.startComposition(this.doc.selection, convertFormatFromSets(this.doc.nextFormat));
      }
    });
    this.textInput.addEventListener('compositionupdate', (event: Event) => {
      this.em.emit(EventName.EDITOR_COMPOSITION_UPDATE);
      if (this.doc.nextFormat) {
        this.doc.updateComposition((event as CompositionEvent).data, convertFormatFromSets(this.doc.nextFormat));
      }
    });
    this.textInput.addEventListener('compositionend', () => {
      this.em.emit(EventName.EDITOR_COMPOSITION_END);
      console.log('EventName.EDITOR_COMPOSITION_END');
      this.composing = false;
      if (this.doc.nextFormat) {
        this.doc.endComposition(this.textInput.value.length);
      }
      this.textInput.value = '';
    });

  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.cvsOffsetX = ((editorConfig.containerWidth - editorConfig.canvasWidth) / 2);
    this.container.style.width = editorConfig.containerWidth + 'px';
    this.container.style.height = editorConfig.containerHeight + 'px';

    this.cvsDoc.id = 'cvsDoc';
    this.cvsDoc.style.width = editorConfig.canvasWidth + 'px';
    this.cvsDoc.style.height = editorConfig.containerHeight + 'px';
    this.cvsDoc.style.left = this.cvsOffsetX + 'px';

    this.cvsCover.id = 'cvsCover';
    this.cvsCover.style.width = editorConfig.canvasWidth + 'px';
    this.cvsCover.style.height = editorConfig.containerHeight + 'px';
    this.cvsCover.style.left = this.cvsOffsetX + 'px';

    const ratio = getPixelRatio(this.ctx);
    this.cvsDoc.width = editorConfig.canvasWidth * ratio;
    this.cvsDoc.height = editorConfig.containerHeight * ratio;
    this.cvsCover.width = editorConfig.canvasWidth * ratio;
    this.cvsCover.height = editorConfig.containerHeight * ratio;
    if (ratio !== 1) { this.ctx.scale(ratio, ratio); }

    this.heightPlaceholderContainer.id = 'heightPlaceholderContainer';
    this.heightPlaceholder.id = 'divHeightPlaceholder';

    this.divCursor = document.createElement('div');
    this.divCursor.id = 'divCursor';
    this.divCursor.tabIndex = -1;

    this.textInput = document.createElement('textarea');
    this.textInput.id = 'textInput';
    this.textInput.tabIndex = -1;
    this.textInput.autocomplete = "off";
    this.textInput.autocapitalize  =  "none";
    this.textInput.spellcheck  = false;

    this.heightPlaceholderContainer.appendChild(this.heightPlaceholder);
    this.heightPlaceholderContainer.appendChild(this.textInput);
    this.heightPlaceholderContainer.appendChild(this.divCursor);
    this.container.appendChild(this.cvsDoc);
    this.container.appendChild(this.cvsCover);
    this.container.appendChild(this.heightPlaceholderContainer);
  }

  /**
   * 绘制文档内容
   */
  private render = () => {
    this.doc.draw(this.ctx, this.scrollTop, editorConfig.containerHeight);
    this.needRender = false;
  }

  /**
   * 开始绘制任务
   */
  private startDrawing() {
    if (!this.needRender) {
      this.needRender = true;
      requestAnimationFrame(this.render);
    }
  }

  private onEditorScroll = () => {
    this.scrollTop = this.heightPlaceholderContainer.scrollTop;
    this.startDrawing();
  }

  private onMouseDown = (event: MouseEvent) => {
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('mouseup', this.onMouseUp, true);

    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY);
    this.selectionStart = this.doc.getDocumentPos(x, y);
    this.startDrawing();
  }

  private onMouseMove = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY);
    const selectionEnd = this.doc.getDocumentPos(x, y);
    this.doc.setSelection({
      index: Math.min(this.selectionStart, selectionEnd),
      length: Math.abs(selectionEnd - this.selectionStart),
    });
  }

  private onMouseUp = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY);
    const selectionEnd = this.doc.getDocumentPos(x, y);
    this.doc.setSelection({
      index: Math.min(this.selectionStart, selectionEnd),
      length: Math.abs(selectionEnd - this.selectionStart),
    });
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('mouseup', this.onMouseUp, true);
    if (this.doc.selection !== null) {
      this.textInput.focus();
    }
  }

  private calOffsetDocPos = (pageX: number, pageY: number): { x: number, y: number } => {
    return {
      x: pageX - this.container.offsetLeft - this.cvsOffsetX,
      y: pageY - this.container.offsetTop + this.scrollTop,
    };
  }

  private onDocumentSelectionChange = () => {
    this.startDrawing();
  }

  private onDocumentSelectionRectangleChange = () => {
    const selection = this.doc.selection;
    if (selection !== null) {
      if (selection.length === 0) {
        this.changeCursorStatus({
          visible: true,
          y: this.doc.selectionRectangles[0].y,
          x: this.doc.selectionRectangles[0].x,
          height: this.doc.selectionRectangles[0].height,
        });
      } else {
        this.changeCursorStatus({ visible: false });
      }
      this.textInput.focus();
    }
  }

  private onDocumentContentChange = () => {
    this.startDrawing();
  }

  private onBackSpace = () => {
    if (this.doc.selection) {
      this.doc.delete(this.doc.selection);
    }
  }

  private onInput = (content: string) => {
    if (this.doc.selection && this.doc.nextFormat) {
      console.log('add content ', this.textInput.value);
      this.doc.insertText(this.textInput.value, this.doc.selection, convertFormatFromSets(this.doc.nextFormat));
    }
  }
}
