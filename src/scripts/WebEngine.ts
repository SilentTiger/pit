import * as EventEmitter from 'eventemitter3';
import { EventName } from "./Common/EnumEventName";
import ICanvasContext from "./Common/ICanvasContext";
import IEngine from "./Common/IEngine";
import Document from "./DocStructure/Document";
import Root from "./RenderStructure/Root";

export default class WebEngine implements IEngine {
  public em = new EventEmitter();
  private ctx: ICanvasContext;
  private doc: Document;
  private renderTree: Root;
  private rootUpdated = false;
  private drawing = false;
  private config = {
    scrollTop: 0,
    height: 0,
    width: 0,
  };

  constructor(ctx: ICanvasContext, config: any) {
    this.ctx = ctx;
    Object.assign(this.config, config);
  }

  public render = () => {
    if (this.rootUpdated) {
      this.drawing = true;
      const start = performance.now();
      this.renderTree.draw(this.ctx);
      console.log(performance.now() - start);
      requestAnimationFrame(this.render);
    } else {
      this.drawing = false;
    }
    this.rootUpdated = false;
  }

  public toChanges(): string {
    throw new Error("Method not implemented.");
  }
  /**
   * 用 change 列表重置当前 engine
   * @param changes change 列表
   */
  public readFromChanges(changes: any[]): void {
    this.destroyRenderTree();
    this.constructNewDocument();
    console.time('construct');
    this.doc.readFromChanges(changes);
    console.timeEnd('construct');
    this.renderTree = new Root();
    this.renderTree.setViewPortHeight(this.config.height);
    this.renderTree.setViewPortPos(this.config.scrollTop);
    this.renderTree.em.addListener(EventName.ROOT_UPDATE, () => {
      this.startDrawing();
    });
    this.renderTree.em.addListener(EventName.ROOT_CHANGE_SIZE, (newSize) => {
      this.em.emit(EventName.ENGINE_CONTENT_CHANGE_SIZE, newSize);
    });
    console.time('layout');
    this.renderTree.setDocument(this.doc);
    console.timeEnd('layout');
  }

  public getSelection(): { index: number; length: number; } {
    throw new Error("Method not implemented.");
  }
  public setSelection(index: number, length: number): void {
    throw new Error("Method not implemented.");
  }
  public insertContent(index: number, frag: import("./DocStructure/Fragment").default): void {
    throw new Error("Method not implemented.");
  }
  public deleteContent(index: number, length: number): void {
    throw new Error("Method not implemented.");
  }
  public formatContent(index: number, length: number, attrs: any): void {
    throw new Error("Method not implemented.");
  }
  public getLength(): number {
    throw new Error("Method not implemented.");
  }
  public getPosition(index: number, length: number): { t: number; r: number; b: number; l: number; } {
    throw new Error("Method not implemented.");
  }
  public getFormat(index: number, length: number): any[] {
    throw new Error("Method not implemented.");
  }
  public removeFormat(index: number, length: number): void {
    throw new Error("Method not implemented.");
  }
  public focus(): void {
    throw new Error("Method not implemented.");
  }
  public blur(): void {
    throw new Error("Method not implemented.");
  }
  /**
   * 设置视口宽度，宽度变化需要重新 layout 并重绘
   * @param width 宽度
   */
  public setWidth(width: number): void {
    throw new Error("Method not implemented.");
  }
  /**
   * 设置视口高度，如果新的高度比原来的大，就需要重新绘制
   * @param height 高度
   */
  public setHeight(height: number): void {
    const needRefresh = this.config.height < height;
    this.config.height = height;
    this.renderTree.setViewPortHeight(height);
    if (needRefresh) {
      this.startDrawing();
    }
  }
  /**
   * 滚动视口到指定位置
   * @param yPos 视口滚动位置
   */
  public scrollToY(yPos: number): void {
    this.config.scrollTop = yPos;
    this.renderTree.setViewPortPos(yPos);
    this.startDrawing();
  }
  public scrollToX(xPos: number): number {
    throw new Error("Method not implemented.");
  }
  public scrollIntoView(index: number, length: number): void {
    throw new Error("Method not implemented.");
  }

  private constructNewDocument() {
    if (this.doc instanceof Document) {
      this.doc.destroy();
    }
    this.doc = new Document();
  }
  private destroyRenderTree() {
    if (this.renderTree instanceof Root) {
      this.renderTree.em.removeAllListeners();
      this.renderTree.destroy();
    }
  }
  private startDrawing() {
    this.rootUpdated = true;
    if (!this.drawing) {
      this.render();
    }
  }
}
