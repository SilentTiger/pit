import * as EventEmitter from 'eventemitter3';
import { throttle } from "lodash";
import { EventName } from "./Common/EnumEventName";
import ICanvasContext from './Common/ICanvasContext';
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
  private heightPlaceholder: HTMLDivElement;
  /**
   * 编辑器画布 DOM 元素
   */
  private cvs: HTMLCanvasElement;
  /**
   * 编辑器画布 context 对象
   */
  private ctx: ICanvasContext;

  private doc: Document = new Document();

  private rendering: boolean = false;
  private needRender: boolean = true;

  private setEditorHeight = throttle((newSize) => {
    this.heightPlaceholder.style.height = newSize.height + 'px';
    this.em.emit(EventName.EDITOR_CHANGE_SIZE, newSize);
  }, 34);

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
    console.log('read ', performance.now());
    this.startDrawing();
  }

  /**
   * 清除文档内容
   */
  public clearData() {
    // TODO
  }

  public scrollTo() { }

  private bindReadEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SIZE, this.setEditorHeight);
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

    this.cvs = document.createElement('canvas') as HTMLCanvasElement;
    this.cvs.style.width = editorConfig.canvasWidth + 'px';
    this.cvs.style.height = editorConfig.containerHeight + 'px';
    this.cvs.style.transform = `translate3d(${this.cvsOffsetX}px, 0, 0)`;

    this.ctx = new WebCanvasContext(this.cvs.getContext('2d'));
    const ratio = getPixelRatio(this.ctx);
    this.cvs.width = editorConfig.canvasWidth * ratio;
    this.cvs.height = editorConfig.containerHeight * ratio;
    if (ratio !== 1) { this.ctx.scale(ratio, ratio); }

    this.heightPlaceholder = document.createElement('div');
    this.heightPlaceholder.id = 'divHeightPlaceholder';
    this.heightPlaceholder.style.height = '0px';
    this.heightPlaceholder.style.width = '0px';

    this.container.appendChild(this.cvs);
    this.container.appendChild(this.heightPlaceholder);
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
    this.cvs.style.transform = `translate3d(${this.cvsOffsetX}px, ${this.scrollTop}px, 0)`;
    this.startDrawing();
  }

  private onMouseDown = (event: MouseEvent) => {
    console.log('mousedown', event);
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('mouseup', this.onMouseUp, true);
  }

  private onMouseMove = (event: MouseEvent) => {
    console.log('mousemove');
  }

  private onMouseUp = (event: MouseEvent) => {
    console.log('mouseup');
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('mouseup', this.onMouseUp, true);
  }

  private onEditorClick = (event: MouseEvent) => {
    this.doc.getDocumentPos(event.offsetX - 15 + this.container.scrollLeft, event.offsetY + this.container.scrollTop);
    this.startDrawing();
  }
}
