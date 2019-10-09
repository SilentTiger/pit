import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import { EnumIntersectionType } from "../Common/util";
import Block from "./Block";
import LayoutFrame from "./LayoutFrame";

export default class QuoteBlock extends Block {
  private padding = 10;

  constructor(frames: LayoutFrame[], maxWidth: number) {
    super(maxWidth);
    this.addAll(frames);
    this.length = frames.reduce((sum: number, f: LayoutFrame) => {
      return sum + f.length;
    }, 0);
    this.setFrameStart();
  }

  public layout() {
    if (this.needLayout) {
      let currentFrame: LayoutFrame | null = null;
      let newWidth = 0;
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i];
        currentFrame.layout();
        currentFrame.x = 20;
        newWidth = Math.max(newWidth, currentFrame.x + currentFrame.width);
      }
      if (this.head !== null) {
        this.head.setPositionY(0, true, true);
      }
      this.needLayout = false;

      let newHeight = 0;
      if (currentFrame !== null) {
        newHeight = currentFrame.y + currentFrame.height + this.padding * 2;
      }
      this.setSize({ height: newHeight, width: newWidth });
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height);
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

  /**
   * 获取指定范围的矩形区域
   */
  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    const rects: IRectangle[] = [];
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
      rects.push(...frameRects);
    }

    return rects;
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, index: number, length: number) {
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst);
    for (let i = 0; i < frames.length; i++) {
      frames[i].setIndent(increase);
    }
    this.needLayout = true;
  }

  public toDelta(): Delta {
    return this.children.reduce((delta: Delta, frame: LayoutFrame) => {
      return delta.concat(frame.toDelta());
    }, new Delta());
  }
  public toHtml(): string {
    return this.children.map((frame) => frame.toHtml()).join('');
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(index: number): QuoteBlock {
    this.needLayout = true;
    const newFrames = super.splitByEnter(index);
    return new QuoteBlock(newFrames, this.maxWidth);
  }

  public remove(target: LayoutFrame) {
    super.remove(target);
    this.needLayout = true;
  }

  /**
   * 渲染当前 quoteblock
   * @param viewHeight 整个画布的高度
   */
  protected render(ctx: ICanvasContext, scrollTop: number, viewHeight: number): void {
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrame = this.children[i];
      currentFrame.draw(ctx, this.x, this.y - scrollTop + this.padding, viewHeight);
    }
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(this.x, this.y + this.padding - scrollTop, 5, this.height - this.padding * 2 );
  }

  /**
   * 给某个 layoutframe 设置最大宽度
   * @param node layoutframe
   */
  protected setChildrenMaxWidth(node: LayoutFrame): void {
    node.setMaxWidth(this.maxWidth - 20);
  }

  /**
   * 设置 layoutframe 的位置索引
   */
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
