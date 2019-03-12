import ICanvasContext from "../Common/ICanvasContext";
import Block from "./Block";
import LayoutFrame from "./LayoutFrame";

export default class QuoteBlock extends Block {
  public frames: LayoutFrame[] = [];

  constructor(frames: LayoutFrame[]) {
    super();
    this.frames = frames;
  }

  public layout() {
    let currentFrame: LayoutFrame;
    for (let i = 0, l = this.frames.length; i < l; i++) {
      currentFrame = this.frames[i];
      currentFrame.layout();
      if (i < l - 1) {
        this.frames[i + 1].y = Math.floor(currentFrame.y + currentFrame.height);
      }
    }

    this.setSize({ height: currentFrame.y + currentFrame.height });
    if (this.nextSibling !== null) {
      this.nextSibling.setPositionY(Math.floor(this.y + this.height));
    }
  }

  protected render(ctx: ICanvasContext): void {
    throw new Error("Method not implemented.");
  }
}
