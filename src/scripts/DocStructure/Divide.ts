import ICanvasContext from "../Common/ICanvasContext";
import editorConfig from '../IEditorConfig';
import Block from "./Block";

export default class Divide extends Block {
  public readonly length = 1;
  public getDocumentPos(x: number, y: number): import("../Common/IDocumentPos").default {
    throw new Error("Method not implemented.");
  }

  public layout() {
    this.needLayout = false;
    if (this.height !== 45) {
      this.setSize({ height: 45 });
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height);
      }
    }
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    ctx.strokeStyle = '#41464b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + 22 - scrollTop);
    ctx.lineTo(this.x + editorConfig.containerWidth, this.y + 22 - scrollTop);
    ctx.stroke();
  }
}
