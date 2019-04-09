import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import Block from "./Block";
import LayoutFrame from "./LayoutFrame";

export default class QuoteBlock extends Block {
  public frames: LayoutFrame[] = [];
  private padding = 10;

  constructor(frames: LayoutFrame[]) {
    super();
    this.frames = frames;
    this.length = frames.reduce((sum: number, f: LayoutFrame) => {
      return sum + f.length;
    }, 0);
    this.setFrameStart();
  }

  public layout() {
    if (this.needLayout) {
      let currentFrame: LayoutFrame | null = null;
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

      let newHeight = 0;
      if (currentFrame !== null) {
        newHeight = currentFrame.y + currentFrame.height + this.padding;
      }
      if (this.height !== newHeight) {
        this.setSize({ height: newHeight });
        if (this.nextSibling !== null) {
          this.nextSibling.setPositionY(Math.floor(this.y + this.height));
        }
      }
    }
  }

  public getDocumentPos(x: number, y: number): number {
    x = x - this.x;
    y = y - this.y;
    for (let index = 0; index < this.frames.length; index++) {
      const frame = this.frames[index];
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.frames.length - 1 && y > frame.y + frame.height)
      ) {
        return frame.getDocumentPos(x - frame.x, y - frame.y) + frame.start;
      }
    }
    return -1;
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    let rects: IRectangle[] = [];
    let offset  = index - this.start;
    const blockLength = offset < 0 ? length + offset : length;
    offset = Math.max(0, offset);
    for (let frameIndex = 0; frameIndex < this.frames.length; frameIndex++) {
      const frame = this.frames[frameIndex];
      if (frame.start + frame.length <= offset) { continue; }
      if (frame.start >= offset + blockLength) { break; }

      const frameOffset = offset - frame.start;
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength;
      const frameRects = frame.getSelectionRectangles(Math.max(frameOffset, 0), frameLength);
      for (let rectIndex = 0; rectIndex < frameRects.length; rectIndex++) {
        const rect = frameRects[rectIndex];
        rect.y += this.y;
        rect.x += this.x;
      }
      rects = rects.concat(frameRects);
    }

    return rects;
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    for (let i = 0, l = this.frames.length; i < l; i++) {
      const currentFrame = this.frames[i];
      currentFrame.draw(ctx, this.x, this.y - scrollTop);
    }
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(this.x, this.y + this.padding, 5, this.height - this.padding * 2 );
  }

  private setFrameStart() {
    if (this.frames.length > 0) {
      this.frames[0].start = 0;
    } else {
      return;
    }
    for (let index = 1; index < this.frames.length; index++) {
      this.frames[index].start = this.frames[index - 1].start + this.frames[index - 1].length;
    }
  }
}
