import { getPixelRatio } from "./Common/Platform";
import { IEditorConfig } from "./IEditorConfig";
import Logger from "./Log";

/**
 * 编辑器类
 */
export default class Editor {
  /**
   * 编辑器配置数据
   */
  private config: IEditorConfig;
  /**
   * 编辑器容器 DOM 元素
   */
  private container: HTMLDivElement;
  /**
   * 编辑器画布 DOM 元素
   */
  private cvs: HTMLCanvasElement;
  /**
   * 编辑器画布 context 对象
   */
  private ctx: CanvasRenderingContext2D;

  /**
   * 编辑器构造函数
   * @param container 编辑器容器 DOM 元素
   * @param config 编辑器配置数据实例
   */
  constructor(container: HTMLDivElement, config: IEditorConfig) {
    this.config = config;
    this.container = container;
    this.initDOM();

    this.ctx = this.cvs.getContext('2d');
  }

  /**
   * 向文档插入文档内容数据
   * @param data 插入的数据
   */
  public insertData(data: string) {
    // TODO
  }

  /**
   * 清除文档内容
   */
  public clearData() {
    // TODO
  }

  /**
   * 渲染文档内容
   */
  public render() {
    // TODO
  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.container.style.width = this.config.containerWidth + 'px';
    this.container.style.height = this.config.containerHeight + 'px';

    this.cvs = document.createElement('canvas') as HTMLCanvasElement;
    this.cvs.style.width = this.config.containerWidth + 'px';
    this.cvs.style.height = this.config.containerHeight + 'px';
    this.ctx = this.cvs.getContext('2d');
    const ratio = getPixelRatio(this.ctx);
    if (ratio > 1) {
      this.cvs.width = this.config.containerWidth * ratio;
      this.cvs.height = this.config.containerHeight * ratio;
      this.ctx.scale(ratio, ratio);
    }

    this.container.appendChild(this.cvs);
  }
}
