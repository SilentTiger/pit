import ICanvasContext from "../Common/ICanvasContext";
import Block from "./Block";

export default class Divide extends Block {
  public layout() {
    this.needLayout = false;
    if (this.height !== 45) {
      this.setSize({ height: 45 });
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height);
      }
    }
  }

  protected render(ctx: ICanvasContext): void {
    ctx.strokeStyle = '#41464b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + 22);
    ctx.lineTo(this.x + 616, this.y + 22);
    ctx.stroke();
  }
}
