import { getPixelRatio } from "./Common/Platform";
import Document from './DocStructure/Document';
import { IEditorConfig } from "./IEditorConfig";
import Root from './RenderStructure/Root';

/**
 * 编辑器类
 */
export default class Editor {
  /**
   * 文档结构数据
   */
  public doc: Document = new Document();

  public renderTree: Root = new Root(this.doc);

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
    this.bindReadEvents();

    requestAnimationFrame(this.render.bind(this));
  }

  public readFromChanges(changes: any[]) {
    this.clearData();
    this.doc = new Document();
    this.doc.readFromChanges(changes);
    this.renderTree = new Root(this.doc);
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
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
    this.renderTree.draw(this.ctx);
    requestAnimationFrame(this.render.bind(this));
  }

  public scrollTo() { }

  private bindReadEvents() {
    this.container.addEventListener('scroll', this.onEditorScroll);
  }

  private bindSelectEvents() {}

  private bindEditEvents() {}

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

    const heightPlaceholder = document.createElement('div');
    heightPlaceholder.id = 'divHeightPlaceholder';
    heightPlaceholder.style.height = this.config.containerHeight * 2 + 'px';
    heightPlaceholder.style.width = '0px';

    this.container.appendChild(this.cvs);
    this.container.appendChild(heightPlaceholder);
  }

  private onEditorScroll = (event: Event) => {
    console.log('current scroll pos: ', this.container.scrollTop);
  }
}
