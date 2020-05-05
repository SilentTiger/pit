import ICanvasContext from '../Common/ICanvasContext'
import { ILinkedListNode } from '../Common/LinkedList'
import Fragment from '../DocStructure/Fragment'
import Line from './Line'
import { EnumCursorType } from '../Common/EnumCursorType'
import { IBubbleUpable } from '../Common/IBubbleElement'
import { IRenderStructure } from '../Common/IRenderStructure'
import { DocPos } from '../Common/DocPos'

export default abstract class Run implements ILinkedListNode, IRenderStructure, IBubbleUpable {
  public x: number
  public y: number
  public width: number = 0;
  public height: number = 0;
  public solidHeight: boolean = false;  // 固定高度，只该元素实际占用高度不受 line 元素的 行高等条件影响
  public prevSibling: this | null = null;
  public nextSibling: this | null = null;
  public parent: Line | null = null;
  public abstract frag: Fragment
  public length = 1;
  protected isPointerHover: boolean = false

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public destroy() {
    // todo
  }

  public abstract draw(ctx: ICanvasContext, x: number, y: number): void
  public abstract calHeight(): number
  public abstract calWidth(): number

  /**
   * 根据坐标获取文档格式信息
   * @param x run 内部 x 坐标
   * @param y run 内部 y 坐标
   */
  public abstract getDocumentPos(x: number, y: number, start: boolean): DocPos

  public setSize(height: number, width: number) {
    this.width = width
    this.height = height
  }

  public calSize() {
    return {
      height: this.calHeight(),
      width: this.calWidth(),
    }
  }

  public setPosition(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public getCoordinatePosX(index: number): number {
    return index === 0 ? 0 : this.width
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.Default
  }

  public onPointerEnter(x: number, y: number) {
    this.isPointerHover = true
    this.frag.onPointerEnter()
  }
  public onPointerLeave() {
    this.isPointerHover = false
    this.frag.onPointerLeave()
  }
  public onPointerMove(x: number, y: number): void {
    this.frag.onPointerMove()
  }
  public onPointerDown(x: number, y: number): void {
    this.frag.onPointerDown()
  }
  public onPointerUp(x: number, y: number): void {
    this.frag.onPointerUp()
  }
  public onPointerTap(x: number, y: number) {
    this.frag.onPointerTap()
  }

  public bubbleUp(type: string, data: any) {
    if (this.parent) {
      this.parent.bubbleUp(type, data, [this])
    }
  }
}
