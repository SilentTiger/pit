import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IExportable from "../Common/IExportable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { hasIntersection } from "../Common/util";
import Document from './Document';
import { IFormatAttributes } from "./FormatAttributes";
import { IFragmentOverwriteAttributes } from "./FragmentOverwriteAttributes";
import FragmentParaEnd from "./FragmentParaEnd";
import LayoutFrame from "./LayoutFrame";

export default abstract class Block extends LinkedList<LayoutFrame> implements ILinkedListNode, IExportable {
  public prevSibling: this | null = null;
  public nextSibling: this | null = null;
  public parent: Document | null = null;

  public start: number = 0;
  public length: number = 0;

  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public needLayout: boolean = true;

  public destroy() {
    this.prevSibling = null;
    this.nextSibling = null;
    this.needLayout = false;
  }

  /**
   * 排版并绘制当前 block 到 canvas
   * @param ctx canvas 上下文
   * @returns 绘制过程中当前 block 高度是否发生变化
   */
  public draw(ctx: ICanvasContext, scrollTop: number) {
    this.render(ctx, scrollTop);
    if ((window as any).blockBorder) {
      ctx.save();
      ctx.strokeStyle = 'green';
      ctx.strokeRect(this.x, this.y - scrollTop, this.width, this.height);
      ctx.restore();
    }
  }

  /**
   * 重新排版当前 block，并返回区块高度是否发生变化
   * @returns 排版过程中当前 block 高度是否发生变化
   */
  public abstract layout(): void;

  /**
   * 获取指定坐标在文档中的逻辑位置信息
   * 包含该位置在文档中的 index 信息
   * @param x x 坐标
   * @param y y 坐标
   */
  public abstract getDocumentPos(x: number, y: number): number;

  /**
   * 设置当前 block 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number, recursive = true, force = false): void {
    if (force === true || this.y !== y) {
      y = Math.floor(y);
      this.y = y;
      // 如果 needLayout 为 true 就不用设置后面的元素的 positionY 了，layout 的时候会设置的
      if (recursive && !this.needLayout) {
        let currentBlock = this;
        let nextSibling = this.nextSibling;
        while (nextSibling !== null) {
          nextSibling.y = (Math.floor(currentBlock.y + currentBlock.height));
          currentBlock = nextSibling;
          nextSibling = currentBlock.nextSibling;
        }
        if (this.parent !== null) {
          const tailBlock = this.parent.tail;
          this.parent.setSize({ height: tailBlock!.y + tailBlock!.height });
        }
      }
    }
  }

  public setStart(index: number, recursive = false, force = false): void {
    if (force === true || this.start !== index) {
      this.start = index;
      if (recursive) {
        let currentBlock: Block = this;
        let nextSibling = currentBlock.nextSibling;
        while (nextSibling !== null) {
          nextSibling.start = currentBlock.start + currentBlock.length;
          currentBlock = nextSibling;
          nextSibling = currentBlock.nextSibling;
        }
        if (this.parent !== null) {
          this.parent.length = currentBlock.start + currentBlock.length;
        }
      }
    }
  }

  public setSize(size: { height?: number, width?: number }) {
    let widthChanged = false;
    if (size.height) {
      this.height = size.height;
      widthChanged = true;
    }
    if (size.width) {
      this.width = size.width;
    }
    if (this.nextSibling === null && widthChanged && this.parent !== null) {
      this.parent.setSize({ height: this.y + size.height!, width: size.width });
    }
  }

  public delete(index: number, length: number): void {
    const frames = this.findLayoutFramesByRange(index, length);
    if (frames.length <= 0) { return; }
    const frameMerge = frames.length > 0 &&
      frames[0].start < index &&
      index + length >= frames[0].start + frames[0].length;

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex];
      if (index <= element.start && index + length >= element.start + element.length) {
        this.remove(element);
      } else {
        const offsetStart = Math.max(index - element.start, 0);
        element.delete(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        );
      }
    }

    // 尝试内部 merge frame
    if (frameMerge) {
      this.mergeFrame();
    }

    if (this.head !== null) {
      this.head.setStart(0, true, true);
    }

    this.calLength();
    this.needLayout = true;
  }

  public format(attr: IFormatAttributes, index: number, length: number): void {
    this.formatSelf(attr);
    const frames = this.findLayoutFramesByRange(index, length);
    if (frames.length <= 0) { return; }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex];
      const offsetStart = Math.max(index - element.start, 0);
      element.format(
        attr,
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      );
    }
    this.needLayout = true;
  }

  /**
   * 在 QuoteBlock 里面找到设计到 range 范围的 layout frame
   * @param index range 的开始位置
   * @param length range 的长度
   */
  public findLayoutFramesByRange(index: number, length: number): LayoutFrame[] {
    let res: LayoutFrame[] = [];
    let current = 0;
    let end = this.children.length;
    let step = 1;
    if (index >= this.length / 2) {
      current = this.children.length - 1;
      end = -1;
      step = -1;
    }

    let found = false;
    for (; current !== end;) {
      const element = this.children[current];
      if (hasIntersection(element.start, element.start + element.length, index, index + length)) {
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

  public isHungry(): boolean {
    return !(this.tail!.tail instanceof FragmentParaEnd);
  }

  /**
   * 吃掉指定的 block
   * @param block 目标 block
   * @return true: 需要删除目标 block
   */
  public eat(block: Block): boolean {
    const res = block.head === block.tail;
    const targetFrame = block.head;
    if (targetFrame instanceof LayoutFrame && this.tail !== null) {
      // 先从 block 中把 targetFrame 删除
      block.remove(targetFrame);
      // 再把 targetFrame 的内容添加到 当前 block 中
      this.tail.addAll(targetFrame.children);
      this.tail.calLength();
      this.mergeFrame();
      this.calLength();
      this.needLayout = true;

    }
    return res;
  }

  /**
   * 根据选区获取选区矩形区域
   * @param index 选区其实位置
   * @param length 选区长度
   */
  public abstract getSelectionRectangles(index: number, length: number): IRectangle[];

  public abstract toDelta(): Delta;

  public abstract toHtml(): string;

  /**
   * 修改当前 block 的 attributes
   * @param attr 需要修改的 attributes
   */
  protected formatSelf(attr: IFormatAttributes): void { }

  /**
   * 绘制当前 block
   * @param ctx canvas 上下文
   */
  protected abstract render(ctx: ICanvasContext, scrollTop: number): void;

  private mergeFrame() {
    for (let frameIndex = 0; frameIndex < this.children.length - 1; frameIndex++) {
      const frame = this.children[frameIndex];
      if (!(frame.tail instanceof FragmentParaEnd)) {
        // 如果某个 frame 没有段落结尾且这个 frame 不是最后一个 frame 就 merge
        const target = this.children[frameIndex + 1];
        frame.eat(target);
        this.remove(target);
        break;
      }
    }
  }

  private calLength() {
    this.length = 0;
    for (let index = 0; index < this.children.length; index++) {
      this.length += this.children[index].length;
    }
  }
}
