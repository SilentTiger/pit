import EditorConfig from "./EditorConfig";
import Logger from "./Log";

/**
 * 编辑器类
 */
export default class Editor {
  /**
   * 编辑器配置数据
   */
  private config: EditorConfig;
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
  constructor(container: HTMLDivElement, config: EditorConfig) {
    this.config = config;
    this.container = container;
    this.initDOM();

    this.ctx = this.cvs.getContext('2d');
    Logger.info(config.pageHeight.toString());
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
    this.container.style.cssText = `width:${this.config.containerWidth}px;height:${this.config.containerHeight}px;`;

    this.cvs = document.createElement('canvas') as HTMLCanvasElement;
    this.cvs.setAttribute('width', this.config.pageWidth.toString());
    this.cvs.setAttribute('height', this.config.pageHeight.toString());
    this.container.appendChild(this.cvs);
  }
}
