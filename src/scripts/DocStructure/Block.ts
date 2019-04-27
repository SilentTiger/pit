import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IExportable from "../Common/IExportable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Document from './Document';

export default abstract class Block implements ILinkedListNode, IExportable {
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
   * 包含该位置在文档中的 index 信息
   * @param x x 坐标
   * @param y y 坐标
   */
  public abstract getDocumentPos(x: number, y: number): number;

  /**
   * 设置当前 block 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number): void {
    if (this.y !== y) {
      this.y = y;
      let currentBlock = this;
      let nextSibling = this.nextSibling;
      while (nextSibling !== null) {
        nextSibling.y = (Math.floor(currentBlock.y + currentBlock.height));
        currentBlock = nextSibling;
        nextSibling = currentBlock.nextSibling;
      }
      if (this.parent !== null) {
        const tailBlock = this.parent.tail;
        this.parent.setSize({height: tailBlock!.y + tailBlock!.height});
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
      this.parent.setSize({height: this.y + size.height!, width: size.width});
    }
  }

  // public abstract devotion(): LayoutFrame | null;

  // public abstract eat(frame: LayoutFrame): void;

  public abstract delete(index: number, length: number): void;

  /**
   * 根据选区获取选区矩形区域
   * @param index 选区其实位置
   * @param length 选区长度
   */
  public abstract getSelectionRectangles(index: number, length: number): IRectangle[];

  public abstract toDelta(): Delta;

  public abstract toHtml(): string;

  /**
   * 绘制当前 block
   * @param ctx canvas 上下文
   */
  protected abstract render(ctx: ICanvasContext, scrollTop: number): void;
}
