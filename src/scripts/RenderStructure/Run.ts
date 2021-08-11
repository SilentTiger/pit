import type ICanvasContext from '../Common/ICanvasContext'
import type { ILinkedListNode } from '../Common/LinkedList'
import type Fragment from '../DocStructure/Fragment'
import type Line from './Line'
import { EnumCursorType } from '../Common/EnumCursorType'
import type { IBubbleUpable } from '../Common/IBubbleUpable'
import type { IRenderStructure } from '../Common/IRenderStructure'
import type { DocPos } from '../Common/DocPos'
import type ICoordinatePos from '../Common/ICoordinatePos'
import type { IGetAbsolutePos } from '../Common/IGetAbsolutePos'

export default abstract class Run implements ILinkedListNode, IRenderStructure, IBubbleUpable, IGetAbsolutePos {
  public x: number
  public y: number
  public width = 0
  public height = 0
  public solidHeight = false // 固定高度，只该元素实际占用高度不受 line 元素的 行高等条件影响
  public prevSibling: this | null = null
  public nextSibling: this | null = null
  public parent: Line | null = null
  public isSpace = false // 标记当前 run 是否为空格或 RunParaEnd
  public length = 1
  public isPointerHover = false
  public abstract frag: Fragment

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public destroy() {
    // todo
  }

  /**
   * 指定 run 的尺寸(这个尺寸和 run 的内容是无关的)
   */
  public setSize(height: number, width: number) {
    this.width = width
    this.height = height
  }

  /**
   * 根据自身内容计算出能包含自身内容的最小尺寸
   */
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

  public abstract bubbleUp(type: string, data: any, stack?: any[]): void
  public abstract getAbsolutePos(): ICoordinatePos | null

  public abstract draw(ctx: ICanvasContext, x: number, y: number, baseline: number): void
  public abstract calHeight(): number
  public abstract calWidth(): number

  /**
   * 根据坐标获取文档格式信息
   * @param x run 内部 x 坐标
   * @param y run 内部 y 坐标
   */
  public abstract getDocumentPos(x: number, y: number, start: boolean): DocPos
}
