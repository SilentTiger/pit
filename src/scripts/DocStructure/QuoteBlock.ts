import ICanvasContext from "../Common/ICanvasContext";
import Block from "./Block";
import LayoutFrame from "./LayoutFrame";

export default class QuoteBlock extends Block {
  public frames: LayoutFrame[] = [];
  private padding = 10;

  constructor(frames: LayoutFrame[]) {
    super();
    this.frames = frames;
  }

  public layout() {
    if (this.needLayout) {
      let currentFrame: LayoutFrame;
      for (let i = 0, l = this.frames.length; i < l; i++) {
        currentFrame = this.frames[i];
        currentFrame.layout();
        if (i < l - 1) {
          this.frames[i + 1].y = Math.floor(currentFrame.y + currentFrame.height);
        }
        currentFrame.x = 20;
        currentFrame.y += this.padding;
      }
      this.needLayout = false;

      this.setSize({ height: currentFrame.y + currentFrame.height + this.padding });
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(Math.floor(this.y + this.height));
      }
    }
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    for (let i = 0, l = this.frames.length; i < l; i++) {
      const currentFrame = this.frames[i];
      currentFrame.draw(ctx, this.x, this.y - scrollTop);
    }
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(this.x, this.y + this.padding, 5, this.height - this.padding * 2 );
  }
}
