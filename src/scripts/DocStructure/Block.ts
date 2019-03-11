import ICanvasContext from "../Common/ICanvasContext";
import { ILinkedListNode } from "../Common/LinkedList";
import Document from './Document';

export default abstract class Block implements ILinkedListNode {
  public prevSibling: Block | null = null;
  public nextSibling: Block | null = null;
  public parent: Document | null = null;

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
  }

  /**
   * 重新排版当前 block，并返回区块高度是否发生变化
   * @returns 排版过程中当前 block 高度是否发生变化
   */
  public abstract layout(): void;

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
