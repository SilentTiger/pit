import * as EventEmitter from 'eventemitter3';
import { EventName } from "./Common/EnumEventName";
import ICanvasContext from './Common/ICanvasContext';
import { getPixelRatio } from "./Common/Platform";
import Document from './DocStructure/Document';
import { IEditorConfig } from "./IEditorConfig";
import WebCanvasContext from "./WebCanvasContext";

/**
 * 编辑器类
 */
export default class Editor {
  public em = new EventEmitter();

  public scrollTop: number = 0;
  /**
   * 编辑器配置数据
   */
  private config: IEditorConfig;
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

  /**
   * 编辑器构造函数
   * @param container 编辑器容器 DOM 元素
   * @param config 编辑器配置数据实例
   */
  constructor(container: HTMLDivElement, config: IEditorConfig) {
    this.config = config;
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

  /**
   * 清除文档内容
   */
  public clearData() {
    // TODO
  }

  public scrollTo() { }

  private bindReadEvents() {
    this.container.addEventListener('scroll', this.onEditorScroll);
  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.container.style.width = this.config.containerWidth + 'px';
    this.container.style.height = this.config.containerHeight + 'px';
    this.container.style.overflowY = 'auto';
    this.container.style.overflowX = 'hidden';

    this.cvs = document.createElement('canvas') as HTMLCanvasElement;
    this.cvs.style.width = this.config.containerWidth - 30 + 'px';
    this.cvs.style.height = this.config.containerHeight + 'px';
    this.cvs.style.position = 'fixed';
    this.cvs.style.top = '0px';
    this.cvs.style.left = '15px';
    this.cvs.style.pointerEvents = 'none';
    this.cvs.style.backgroundColor = '#ddd';
    this.ctx = new WebCanvasContext(this.cvs.getContext('2d'));
    const ratio = getPixelRatio(this.ctx);
    this.cvs.width = (this.config.containerWidth - 30) * ratio;
    this.cvs.height = this.config.containerHeight * ratio;
    this.ctx.scale(ratio, ratio);

    this.heightPlaceholder = document.createElement('div');
    this.heightPlaceholder.id = 'divHeightPlaceholder';
    this.heightPlaceholder.style.height = this.config.containerHeight * 2 + 'px';
    this.heightPlaceholder.style.width = '0px';

    this.container.appendChild(this.cvs);
    this.container.appendChild(this.heightPlaceholder);
  }

  /**
   * 绘制文档内容
   */
  private render = () => {
    if (this.needRender) {
      this.rendering = true;
      this.doc.draw(this.ctx, this.scrollTop, this.config.containerHeight);
      requestAnimationFrame(this.render);
    } else {
      this.rendering = false;
    }

    this.needRender = false;
  }

  /**
   * 开始绘制任务
   */
  private startDrawing() {
    if (!this.rendering) {
      this.render();
    }
  }
}
