import { EventName } from "./Common/EnumEventName";
import ICanvasContext from "./Common/ICanvasContext";
import IEngine from "./Common/IEngine";
import Document from "./DocStructure/Document";
import Root from "./RenderStructure/Root";

export default class WebEngine implements IEngine {
  private ctx: ICanvasContext;
  private doc: Document;
  private renderTree: Root;
  private rootUpdated = false;
  private drawing = false;

  constructor(ctx: ICanvasContext) {
    this.ctx = ctx;
  }

  public render = () => {
    if (this.rootUpdated) {
      this.drawing = true;
      this.renderTree.draw(this.ctx);
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
    this.doc.readFromChanges(changes);
    this.renderTree = new Root(this.doc);
    this.renderTree.em.addListener(EventName.ROOT_UPDATE, () => {
      this.startDrawing();
    });
    this.startDrawing();
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
  public setWidth(width: number): void {
    throw new Error("Method not implemented.");
  }
  public setHeight(height: number): void {
    throw new Error("Method not implemented.");
  }
  public scrollToY(yPos: number): number {
    throw new Error("Method not implemented.");
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
