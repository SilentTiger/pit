import ICanvasContext from "../Common/ICanvasContext";
import editorConfig from '../IEditorConfig';
import Block from "./Block";
import IDocumentPos from "../Common/IDocumentPos";
import IRectangle from "../Common/IRectangle";

export default class Divide extends Block {
  public readonly length = 1;
  public readonly height = 45;
  public readonly width:number;

  constructor(maxWidth: number) {
    super();
    this.width = maxWidth;
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

  public getDocumentPos(x: number, y: number): IDocumentPos {
    let posData;
    const offsetX = x - this.x;
    let target: Block;
    if (offsetX < this.width / 2) {
      target = this.prevSibling
    } else {
      target = this.nextSibling
    }
    posData = target.getDocumentPos(x, y);
    posData.index += target.start - this.start;
    posData.PosX = posData.PosX + target.x - this.x;
    posData.PosYLine = posData.PosYLine + target.y - this.y;
    posData.PosYText = posData.PosYText + target.y - this.y;

    return posData;
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    let rects: IRectangle[]=[];
    let offset  = index - this.start;
    let blockLength = offset < 0 ? length + offset : length;
    offset = Math.max(0, offset);
    if(offset === 0 && blockLength >=1){
      rects = [{
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
      }]
    }
    return rects;
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
