import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IExportable from "../Common/IExportable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { collectAttributes, EnumIntersectionType, findChildrenByRange } from "../Common/util";
import Document from './Document';
import { IFormatAttributes } from "./FormatAttributes";
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
  public maxWidth: number = 0;
  public needLayout: boolean = true;

  constructor(maxWidth: number) {
    super();
    this.maxWidth = maxWidth;
  }

  public destroy() {
    this.prevSibling = null;
    this.nextSibling = null;
    this.needLayout = false;
  }

  //#region override LinkedList method
  /**
   * 将一个 layoutframe 添加到当前 block
   * @param node 要添加的 layoutframe
   */
  public add(node: LayoutFrame) {
    super.add(node);
    node.setMaxWidth(this.maxWidth);
    node.start = this.length;
    this.length += node.length;
  }

  /**
   * 在目标 layoutframe 实例前插入一个 layoutframe
   * @param node 要插入的 layoutframe 实例
   * @param target 目标 layoutframe 实例
   */
  public addBefore(node: LayoutFrame, target: LayoutFrame) {
    super.addBefore(node, target);
    node.setMaxWidth(this.maxWidth);
    const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length;
    node.setStart(start, true, true);
    this.length += node.length;
  }

  /**
   * 在目标 layoutframe 实例后插入一个 layoutframe
   * @param node 要插入的 layoutframe 实例
   * @param target 目标 layoutframe 实例
   */
  public addAfter(node: LayoutFrame, target: LayoutFrame) {
    super.addAfter(node, target);
    node.setMaxWidth(this.maxWidth);
    node.setStart(target.start + target.length, true, true);
    this.length += node.length;
  }

  /**
   * 清楚当前 block 中所有 layoutframe
   */
  public removeAll() {
    this.length = 0;
    return super.removeAll();
  }

  /**
   * 从当前 block 删除一个 layoutframe
   * @param frame 要删除的 layoutframe
   */
  public remove(frame: LayoutFrame) {
    if (frame.nextSibling !== null) {
      const start = frame.prevSibling === null ? 0 : frame.prevSibling.start + frame.prevSibling.length;
      frame.nextSibling.setStart(start, true, true);
    }

    super.remove(frame);
    this.length -= frame.length;
  }
  //#endregion

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
   * 重新排版当前 block
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

  /**
   * 设置当前 block 的最大宽度
   * @param width 宽度
   */
  public setMaxWidth(width: number) {
    this.maxWidth = width;
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

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param selection 选区
   */
  public format(attr: IFormatAttributes, index: number, length: number): void {
    this.formatSelf(attr, index, length);
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst);
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
   * 清除选区范围内容的格式
   * @param index 需要清除格式的选区开始位置（相对当前 block 内容的位置）
   * @param length 需要清除格式的选区长度
   */
  public clearFormat(index: number, length: number) {
    this.clearSelfFormat(index, length);
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst);
    if (frames.length <= 0) { return; }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex];
      const offsetStart = Math.max(index - element.start, 0);
      element.clearFormat(
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      );
    }
    this.needLayout = true;
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, index: number, length: number) {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].setIndent(increase);
    }
    this.needLayout = true;
  }

  /**
   * 在 QuoteBlock 里面找到设计到 range 范围的 layout frame
   * @param index range 的开始位置
   * @param length range 的长度
   */
  public findLayoutFramesByRange(
    index: number, length: number,
    intersectionType = EnumIntersectionType.both,
  ): LayoutFrame[] {
    return findChildrenByRange<LayoutFrame>(this.children, this.length, index, length, intersectionType);
  }

  /**
   * 判断当前 block 是否需要吃掉后面的 block 中的内容
   * 取决于当前 block 中最后一个 layoutframe 是有在结尾处有 FragmentParaEnd
   */
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
   * 获取某个范围内的内容格式
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const res: { [key: string]: Set<any> } = {};
    const frames = this.findLayoutFramesByRange(index, length, EnumIntersectionType.rightFirst);
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const element = frames[frameIndex];
      const offsetStart = Math.max(index - element.start, 0);
      collectAttributes(
        element.getFormat(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        ), res);
    }
    return res;
  }

  /**
   * 根据选区获取选区矩形区域
   * @param index 选区其实位置
   * @param length 选区长度
   */
  public abstract getSelectionRectangles(index: number, length: number): IRectangle[];

  /**
   * 将当前 block 输出为 delta
   */
  public abstract toDelta(): Delta;

  /**
   * 将当前 block 输出为 html
   */
  public abstract toHtml(): string;

  /**
   * 修改当前 block 的 attributes
   * @param attr 需要修改的 attributes
   */
  // tslint:disable-next-line: no-empty
  protected formatSelf(attr: IFormatAttributes, index?: number, length?: number): void { }

  /**
   * 清除格式时重置当前 block 的格式到默认状态
   * @param index 选区方位开始位置
   * @param length 选区长度
   */
  // tslint:disable-next-line: no-empty
  protected clearSelfFormat(index?: number, length?: number): void { }

  /**
   * 给某个 layoutframe 设置最大宽度为当前 block 的最大宽度
   * @param node layoutframe
   */
  protected setChildrenMaxWidth(node: LayoutFrame): void {
    node.setMaxWidth(this.maxWidth);
  }

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

  /**
   * 计算当前 block 的长度
   */
  private calLength() {
    this.length = 0;
    for (let index = 0; index < this.children.length; index++) {
      this.length += this.children[index].length;
    }
  }
}
