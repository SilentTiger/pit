import IDocumentPos from "../Common/IDocumentPos";
import { IDrawable } from "../Common/IDrawable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Fragment from "../DocStructure/Fragment";
import Line from "./Line";

export default abstract class Run implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public solidHeight: boolean = false;  // 固定高度，只该元素实际占用高度不受 line 元素的 行高等条件影响
  public prevSibling: Run = null;
  public nextSibling: Run = null;
  public parent: Line;
  public frag: Fragment;
  public length = 1;

  constructor(fragment: Fragment, x: number, y: number) {
    this.frag = fragment;
    this.x = x;
    this.y = y;
  }

  public destroy() {
    // todo
  }

  public abstract draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
  public abstract calHeight(): number;
  public abstract calWidth(): number;

  /**
   * 根据坐标获取文档格式信息
   * @param x run 内部 x 坐标
   * @param y run 内部 y 坐标
   * @param mustTail 是否一定要取末尾坐标
   */
  public abstract getDocumentPos(x: number, y: number, tryHead?: boolean): Partial<IDocumentPos> | null;

  public setSize = (height: number, width: number) => {
    this.width = width;
    this.height = height;
  }

  public calSize = () => {
    return {
      height: this.calHeight(),
      width: this.calWidth(),
    };
  }

  public setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public getCoordinatePosX(index: number): number {
    return index === 0 ? 0 : this.width;
  }
}
