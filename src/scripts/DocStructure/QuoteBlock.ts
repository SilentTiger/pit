import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import Block from "./Block";
import FragmentParaEnd from "./FragmentParaEnd";
import LayoutFrame from "./LayoutFrame";

export default class QuoteBlock extends Block {
  private padding = 10;

  constructor(frames: LayoutFrame[]) {
    super();
    this.addAll(frames);
    this.length = frames.reduce((sum: number, f: LayoutFrame) => {
      return sum + f.length;
    }, 0);
    this.setFrameStart();
  }

  public layout() {
    if (this.needLayout) {
      let currentFrame: LayoutFrame | null = null;
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i];
        currentFrame.layout();
        if (i < l - 1) {
          this.children[i + 1].y = Math.floor(currentFrame.y + currentFrame.height);
        }
        currentFrame.x = 20;
      }
      this.needLayout = false;

      let newHeight = 0;
      if (currentFrame !== null) {
        newHeight = currentFrame.y + currentFrame.height + this.padding * 2;
      }
      if (this.height !== newHeight) {
        this.setSize({ height: newHeight });
        if (this.nextSibling !== null) {
          this.nextSibling.setPositionY(this.y + this.height);
        }
      }
    }
  }

  public getDocumentPos(x: number, y: number): number {
    x = x - this.x;
    y = y - this.y - this.padding;
    for (let index = 0; index < this.children.length; index++) {
      const frame = this.children[index];
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.children.length - 1 && y > frame.y + frame.height)
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
    for (let frameIndex = 0; frameIndex < this.children.length; frameIndex++) {
      const frame = this.children[frameIndex];
      if (frame.start + frame.length <= offset) { continue; }
      if (frame.start > offset + blockLength) { break; }

      const frameOffset = offset - frame.start;
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength;
      const frameRects = frame.getSelectionRectangles(Math.max(frameOffset, 0), frameLength);
      for (let rectIndex = 0; rectIndex < frameRects.length; rectIndex++) {
        const rect = frameRects[rectIndex];
        rect.y += this.y + this.padding;
        rect.x += this.x;
      }
      rects = rects.concat(frameRects);
    }

    return rects;
  }

  public toDelta(): Delta {
    return this.children.reduce((delta: Delta, frame: LayoutFrame) => {
      return delta.concat(frame.toDelta());
    }, new Delta());
  }
  public toHtml(): string {
    return this.children.map((frame) => frame.toHtml()).join('');
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrame = this.children[i];
      currentFrame.draw(ctx, this.x, this.y - scrollTop + this.padding);
    }
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(this.x, this.y + this.padding - scrollTop, 5, this.height - this.padding * 2 );
  }

  private setFrameStart() {
    if (this.children.length > 0) {
      this.children[0].start = 0;
    } else {
      return;
    }
    for (let index = 1; index < this.children.length; index++) {
      this.children[index].start = this.children[index - 1].start + this.children[index - 1].length;
    }
  }
}
