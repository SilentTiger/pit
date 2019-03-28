import ICanvasContext from "../Common/ICanvasContext";
import IDocumentPos from "../Common/IDocumentPos";
import { ILinkedListNode } from "../Common/LinkedList";
import Document from './Document';

export default abstract class Block implements ILinkedListNode {
  public prevSibling: Block | null = null;
  public nextSibling: Block | null = null;
  public parent: Document | null = null;

  public start: number;
  public length: number;

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
    this.layout();
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
   * 包含该位置在文档中的 index 信息、行高、文字高度、颜色、及
   * @param x x 坐标
   * @param y y 坐标
   */
  public abstract getDocumentPos(x: number, y: number): IDocumentPos;

  /**
   * 设置当前 block 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number): void {
    if (this.y !== y) {
      this.y = y;
      let currentBlock: Block = this;
      let nextSibling = this.nextSibling;
      while (nextSibling !== null) {
        nextSibling.y = (Math.floor(currentBlock.y + currentBlock.height));
        currentBlock = nextSibling;
        nextSibling = currentBlock.nextSibling;
      }
      const tailBlock = this.parent.tail;
      this.parent.setSize({height: tailBlock.y + tailBlock.height});
    }
  }

  public setStart(index: number, recursive = false): void {
    if (this.start !== index) {
      this.start = index;
      if (recursive) {
        let currentBlock: Block = this;
        let nextSibling = currentBlock.nextSibling;
        while (nextSibling !== null) {
          nextSibling.start = currentBlock.start + currentBlock.length;
          currentBlock = nextSibling;
          nextSibling = currentBlock.nextSibling;
        }
        this.parent.length = currentBlock.start + currentBlock.length;
      }
    }
  }

  public setSize(size: { height?: number, width?: number }) {
    let changed = false;
    if (size.height) {
      this.height = size.height;
      changed = true;
    }
    if (size.width) {
      this.width = size.width;
      changed = true;
    }
    if (this.nextSibling === null && changed) {
      this.parent.setSize({height: this.y + size.height, width: size.width});
    }
  }

  /**
   * 绘制当前 block
   * @param ctx canvas 上下文
   */
  protected abstract render(ctx: ICanvasContext, scrollTop: number): void;
}
