import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import Block from "./Block";
import FragmentParaEnd from "./FragmentParaEnd";
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
      }
      this.needLayout = false;

      let newHeight = 0;
      if (currentFrame !== null) {
        newHeight = currentFrame.y + currentFrame.height + this.padding * 2;
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
    y = y - this.y - this.padding;
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
    return this.frames.reduce((delta: Delta, frame: LayoutFrame) => {
      return delta.concat(frame.toDelta());
    }, new Delta());
  }
  public toHtml(): string {
    return this.frames.map((frame) => frame.toHtml()).join('');
  }

  public delete(index: number, length: number): void {
    const frames = this.findLayoutFramesByRange(index, length);
    if (frames.length <= 0) { return; }
    const blockMerge = frames.length > 0 &&
      frames[0].start > index &&
      index + length >= frames[0].start + frames[0].length;

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex];
      if (index <= element.start && index + length >= element.start + element.length) {
        this.frames.splice(frameIndex, 1);
        frameIndex--;
      } else {
        const offsetStart = Math.max(index - element.start, 0);
        element.delete(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        );
      }
    }
    this.needLayout = true;
  }

  public isHungry(): boolean {
    const lastFrame = this.frames[this.frames.length - 1];
    return !(lastFrame.tail instanceof FragmentParaEnd);
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    for (let i = 0, l = this.frames.length; i < l; i++) {
      const currentFrame = this.frames[i];
      currentFrame.draw(ctx, this.x, this.y - scrollTop + this.padding);
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

  /**
   * 在 QuoteBlock 里面找到设计到 range 范围的 layoutframe
   * @param index range 的开始位置
   * @param length range 的长度
   */
  private findLayoutFramesByRange(index: number, length: number): LayoutFrame[] {
    let res: LayoutFrame[] = [];
    let current = 0;
    let end = this.frames.length;
    let step = 1;
    if (index >= this.length / 2) {
        current = this.frames.length - 1;
        end = -1;
        step = -1;
      }

    let found = false;
    for (; current !== end;) {
      const element = this.frames[current];
      if (
        (element.start <= index && index < element.start + element.length) ||
        (element.start < index + length && index + length < element.start + element.length) ||
        (index <= element.start && element.start + element.length <= index + length)
      ) {
        found = true;
        res.push(element);
        current += step;
      } else {
        if (found) {
          break;
        } else {
          current += step;
          continue;
        }
      }
    }
    if (step === -1) {
      res = res.reverse();
    }
    return res;
  }
}
