import * as EventEmitter from 'eventemitter3';
import { throttle } from "lodash";
import { EventName } from "./Common/EnumEventName";
import ICanvasContext from './Common/ICanvasContext';
import IRange from './Common/IRange';
import { getPixelRatio } from "./Common/Platform";
import Document from './DocStructure/Document';
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
  private heightPlaceholder: HTMLDivElement = document.createElement('div');
  private selectionStart: number = 0;
  private divCursor: HTMLDivElement = document.createElement('div');
  private textInput: HTMLTextAreaElement = document.createElement('textarea');
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

  private rendering: boolean = false;
  private needRender: boolean = true;

  private setEditorHeight = throttle((newSize) => {
    this.heightPlaceholder.style.height = newSize.height + 'px';
    this.em.emit(EventName.EDITOR_CHANGE_SIZE, newSize);
  }, 34);

  private changeCursorStatus = (() => {
    let showCursor = false;
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
        if (showCursor === false) {
          this.textInput.style.display = "block";
          this.textInput.focus();
        }
      } else if (status.visible === false) {
        this.textInput.style.display = "none";
      }
      if (status.visible !== undefined) {
        showCursor = status.visible;
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
  }

  /**
   * 通过 delta 初始化文档内容
   * @param changes change 数组
   */
  public readFromChanges(changes: any[]) {
    this.doc.readFromChanges(changes);
    this.startDrawing();
  }

  public setSelection(index: number, length: number) {
    this.doc.setSelection(index, length);
  }

  public getSelection(): IRange | null {
    return this.doc.selection;
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

  private bindReadEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SIZE, this.setEditorHeight);
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SELECTION, this.onDocumentSelectionChange);
    this.container.addEventListener('scroll', this.onEditorScroll);

    this.container.addEventListener('mousedown', this.onMouseDown);
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
    this.cvsDoc.style.transform = `translate3d(${this.cvsOffsetX}px, 0, 0)`;

    this.cvsCover.id = 'cvsCover';
    this.cvsCover.style.width = editorConfig.canvasWidth + 'px';
    this.cvsCover.style.height = editorConfig.containerHeight + 'px';
    this.cvsCover.style.transform = `translate3d(${this.cvsOffsetX}px, 0, 0)`;

    const ratio = getPixelRatio(this.ctx);
    this.cvsDoc.width = editorConfig.canvasWidth * ratio;
    this.cvsDoc.height = editorConfig.containerHeight * ratio;
    this.cvsCover.width = editorConfig.canvasWidth * ratio;
    this.cvsCover.height = editorConfig.containerHeight * ratio;
    if (ratio !== 1) { this.ctx.scale(ratio, ratio); }

    this.heightPlaceholder = document.createElement('div');
    this.heightPlaceholder.id = 'divHeightPlaceholder';
    this.heightPlaceholder.style.height = '0px';
    this.heightPlaceholder.style.width = '0px';

    this.divCursor = document.createElement('div');
    this.divCursor.id = 'divCursor';
    this.divCursor.tabIndex = -1;

    this.textInput = document.createElement('textarea');
    this.textInput.id = 'textInput';
    this.textInput.tabIndex = -1;
    this.textInput.style.display  = 'none';
    this.textInput.autocomplete = "off";
    this.textInput.autocapitalize  =  "none";
    this.textInput.spellcheck  = false;

    this.container.appendChild(this.textInput);
    this.container.appendChild(this.cvsDoc);
    this.container.appendChild(this.cvsCover);
    this.container.appendChild(this.heightPlaceholder);
    this.container.appendChild(this.divCursor);
  }

  /**
   * 绘制文档内容
   */
  private render = () => {
    if (this.needRender) {
      this.needRender = false;
      this.rendering = true;
      this.doc.draw(this.ctx, this.scrollTop, editorConfig.containerHeight);
      requestAnimationFrame(this.render);
    } else {
      this.needRender = false;
      this.rendering = false;
    }
  }

  /**
   * 开始绘制任务
   */
  private startDrawing() {
    this.needRender = true;
    if (!this.rendering) {
      this.render();
    }
  }

  private onEditorScroll = () => {
    this.scrollTop = this.container.scrollTop;
    this.cvsDoc.style.transform = `translate3d(${this.cvsOffsetX}px, ${this.scrollTop}px, 0)`;
    this.cvsCover.style.transform = `translate3d(${this.cvsOffsetX}px, ${this.scrollTop}px, 0)`;
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
    this.doc.setSelection(
      Math.min(this.selectionStart, selectionEnd),
      Math.abs(selectionEnd - this.selectionStart),
    );
  }

  private onMouseUp = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY);
    const selectionEnd = this.doc.getDocumentPos(x, y);
    this.doc.setSelection(
      Math.min(this.selectionStart, selectionEnd),
      Math.abs(selectionEnd - this.selectionStart),
    );
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('mouseup', this.onMouseUp, true);
  }

  private calOffsetDocPos = (pageX: number, pageY: number): { x: number, y: number } => {
    return {
      x: pageX - this.container.offsetLeft - this.cvsOffsetX,
      y: pageY - this.container.offsetTop + this.scrollTop,
    };
  }

  private onDocumentSelectionChange = (selection: IRange) => {
    if (selection !== null && selection.length === 0) {
      this.changeCursorStatus({
        visible: true,
        y: this.doc.selectionRectangles[0].y,
        x: this.doc.selectionRectangles[0].x,
        height: this.doc.selectionRectangles[0].height,
      });
    } else {
      this.changeCursorStatus({visible: false});
    }
    this.startDrawing();
    console.log('rect ', this.doc.selectionRectangles);
  }
}
