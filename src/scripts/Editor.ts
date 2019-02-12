import * as EventEmitter from 'eventemitter3';
import { EventName } from "./Common/EnumEventName";
import IEngine from "./Common/IEngine";
import { getPixelRatio } from "./Common/Platform";
import { IEditorConfig } from "./IEditorConfig";
import WebCanvasContext from "./WebCanvasContext";
import WebEngine from "./WebEngine";

/**
 * 编辑器类
 */
export default class Editor {
  public em = new EventEmitter();
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
  private ctx: CanvasRenderingContext2D;

  private engine: IEngine;

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

    this.engine = new WebEngine(new WebCanvasContext(this.ctx), {
      scrollTop: 0,
      height: this.config.containerHeight,
      width: this.config.containerWidth,
    });
    this.engine.em.addListener(EventName.ENGINE_CONTENT_CHANGE_SIZE, (newSize) => {
      this.heightPlaceholder.style.height = newSize.height + 'px';
    });
  }

  public readFromChanges(changes: any[]) {
    this.engine.readFromChanges(changes);
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
    this.ctx = this.cvs.getContext('2d');
    const ratio = getPixelRatio(this.ctx);
    if (ratio > 1) {
      this.cvs.width = this.config.containerWidth * ratio;
      this.cvs.height = this.config.containerHeight * ratio;
      this.ctx.scale(ratio, ratio);
    }

    this.heightPlaceholder = document.createElement('div');
    this.heightPlaceholder.id = 'divHeightPlaceholder';
    this.heightPlaceholder.style.height = this.config.containerHeight * 2 + 'px';
    this.heightPlaceholder.style.width = '0px';

    this.container.appendChild(this.cvs);
    this.container.appendChild(this.heightPlaceholder);
  }

  private onEditorScroll = (event: Event) => {
    this.engine.scrollToY(this.container.scrollTop);
  }
}
