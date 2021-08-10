import EventEmitter from 'eventemitter3'
import type ICanvasContext from '../Common/ICanvasContext'
import type { ILinkedList } from '../Common/LinkedList'
import { ILinkedListDecorator } from '../Common/LinkedList'
import { EnumAlign } from '../DocStructure/EnumParagraphStyle'
import type Fragment from '../DocStructure/Fragment'
import { FragmentDefaultAttributes } from '../DocStructure/FragmentAttributes'
import FragmentText from '../DocStructure/FragmentText'
import type Run from './Run'
import RunText from './RunText'
import { findRectChildInPos } from '../Common/util'
import type { IRenderStructure } from '../Common/IRenderStructure'
import { EnumCursorType } from '../Common/EnumCursorType'
import type { IBubbleUpable } from '../Common/IBubbleElement'
import type LayoutFrame from '../DocStructure/LayoutFrame'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import type { IPointerInteractive } from '../Common/IPointerInteractive'
import { IPointerInteractiveDecorator } from '../Common/IPointerInteractive'
import type ICoordinatePos from '../Common/ICoordinatePos'
import { getPlatform } from '../Platform'

@ILinkedListDecorator
@IPointerInteractiveDecorator
export default class Line implements ILinkedList<Run>, IRenderStructure, IBubbleUpable {
  public children: Run[] = []
  public head: Run | null = null
  public tail: Run | null = null
  public parent: LayoutFrame | null = null
  public start = 0
  public length = 0
  public x: number
  public y: number
  public width = 0
  public height = 0
  public em = new EventEmitter()
  public baseline = 0
  public linespacing = 1.7
  public maxWidth = 0

  private minBaseline = 0
  private minHeight = 0

  private backgroundList: Array<{ start: number; end: number; background: string }> = []
  private underlineList: Array<{ start: number; end: number; posY: number; color: string }> = []
  private strikeList: Array<{ start: number; end: number; posY: number; color: string }> = []
  private composingUnderline: Array<{ start: number; end: number; posY: number }> = []

  private isPointerHover = false

  constructor(x: number, y: number, linespacing: number, maxWidth: number, minBaseline = 0, minHeight = 0) {
    this.x = x
    this.y = y
    this.linespacing = linespacing
    this.maxWidth = maxWidth
    this.minBaseline = minBaseline
    this.minHeight = minHeight
  }

  public destroy() {
    // todo
  }

  /**
   * 给当前行添加一个 run
   */
  public afterAdd(run: Run) {
    const newWidth = this.width + run.width
    const ls = run.solidHeight ? 1 : this.linespacing
    const runHeight = run instanceof RunText ? getPlatform().convertPt2Px[run.frag.attributes.size] : run.height
    const newHeight = Math.max(this.height, runHeight * ls)
    const newBaseline = Math.max(this.baseline, (newHeight - run.frag.metrics.bottom) / 2 + run.frag.metrics.baseline)
    this.setBaseline(newBaseline)
    this.setSize(newHeight, newWidth)
    this.length += run.length
  }

  /**
   * 绘制一行内容
   * @param ctx ICanvasContext
   * @param x 绘制位置的 x 坐标
   * @param y 绘制位置的 y 坐标
   */
  public draw(ctx: ICanvasContext, x: number, y: number) {
    // 先画背景色
    this.backgroundList.forEach((item) => {
      ctx.fillStyle = item.background
      ctx.fillRect(item.start + this.x + x, this.y + y, item.end - item.start, this.height)
    })

    // 再画内容
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].draw(ctx, this.x + x, this.y + y)
    }

    ctx.lineWidth = 1
    // 画下划线
    this.underlineList.forEach((item) => {
      ctx.beginPath()
      ctx.moveTo(item.start + this.x + x, item.posY + y)
      ctx.lineTo(item.end + this.x + x, item.posY + y)
      ctx.strokeStyle = item.color
      ctx.stroke()
    })
    // 画输入法输入过程中字符内容的下划线
    if (this.composingUnderline.length > 0) {
      const oldLineWidth = ctx.lineWidth
      ctx.lineWidth = 1.5
      this.composingUnderline.forEach((item) => {
        ctx.beginPath()
        ctx.moveTo(item.start + this.x + x, item.posY + y)
        ctx.lineTo(item.end + this.x + x, item.posY + y)
        ctx.strokeStyle = '#67aef9'
        ctx.stroke()
      })
      ctx.lineWidth = oldLineWidth
    }
    // 画删除线
    this.strikeList.forEach((item) => {
      ctx.beginPath()
      ctx.moveTo(item.start + this.x + x, item.posY + y)
      ctx.lineTo(item.end + this.x + x, item.posY + y)
      ctx.strokeStyle = item.color
      ctx.stroke()
    })

    // 最后绘制调试信息
    if ((window as any).lineBorder || this.isPointerHover) {
      ctx.save()
      ctx.strokeStyle = 'red'
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)
      ctx.restore()
    }
  }

  /**
   * 对当前行排版
   */
  public layout(align: EnumAlign) {
    // line 的布局算法需要计算出此 line 中每个 run 的具体位置
    // 注意每行最后一个 run 如果是空格或者 RunParaEnd，这个 run 是不占位置的
    // 同时还需要计算此 line 中每一段背景色、下划线、删除线的起始位置

    let startX = 0
    let spaceWidth = 0

    switch (align) {
      case EnumAlign.left:
      case EnumAlign.scattered:
        startX = 0
        break
      case EnumAlign.justify: {
        let spaceCount = this.children.length - 1
        if (this.tail?.isSpace) {
          spaceCount--
        }
        const totalContentWidth = this.children.reduce((totalWidth, cur: Run, index: number) => {
          if (cur.isSpace && index === this.children.length - 1) {
            return totalWidth
          } else {
            return totalWidth + cur.width
          }
        }, 0)
        spaceWidth = (this.maxWidth - totalContentWidth) / spaceCount
        startX = 0
        break
      }
      case EnumAlign.center: {
        const totalContentWidth = this.children.reduce((totalWidth, cur: Run, index: number) => {
          if (cur.isSpace && index === this.children.length - 1) {
            return totalWidth
          } else {
            return totalWidth + cur.width
          }
        }, 0)
        startX = (this.maxWidth - totalContentWidth) / 2
        break
      }
      case EnumAlign.right: {
        const totalContentWidth = this.children.reduce((totalWidth, cur: Run, index: number) => {
          if (cur.isSpace && index === this.children.length - 1) {
            return totalWidth
          } else {
            return totalWidth + cur.width
          }
        }, 0)
        startX = this.maxWidth - totalContentWidth
        break
      }
    }

    let backgroundStart = false
    let backgroundRange = { start: startX, end: 0, background: '' }
    const underlinePosY = this.y + this.baseline + 2
    let underlineStart = false
    let underlineRange = { start: startX, end: 0, posY: this.calClearPosY(underlinePosY), color: '' }
    let composingUnderlineStart = false
    let composingUnderlineRange = { start: startX, end: 0, posY: this.calClearPosY(underlinePosY) }
    let strikeStart = false
    let strikeRange = { start: startX, end: 0, posY: 0.5, color: '' }
    let strikeFrag: Fragment | null = null
    let currentRun = this.head
    while (currentRun !== null) {
      currentRun.y = this.baseline - currentRun.frag.metrics.baseline
      currentRun.x = Math.min(
        this.maxWidth,
        currentRun.prevSibling === null ? startX : currentRun.prevSibling.x + currentRun.prevSibling.width + spaceWidth,
      )

      // 如果是分散对齐的话，要把前面一个 run 的宽度调大一点，以免 run 之间有间隙
      if (align === EnumAlign.justify && currentRun.prevSibling) {
        currentRun.prevSibling.setSize(currentRun.prevSibling.height, currentRun.x - currentRun.prevSibling.x)
      }

      if (backgroundStart) {
        if (currentRun.frag.attributes.background !== backgroundRange.background) {
          backgroundRange.end = currentRun.x
          this.backgroundList.push(backgroundRange)
          backgroundStart = false
          backgroundRange = { start: startX, end: 0, background: '' }
          if (currentRun.frag.attributes.background !== FragmentDefaultAttributes.background) {
            backgroundRange.start = currentRun.x
            backgroundRange.background = currentRun.frag.attributes.background
            backgroundStart = true
          }
        }
      } else if (currentRun.frag.attributes.background !== FragmentDefaultAttributes.background) {
        backgroundRange.start = currentRun.x
        backgroundRange.background = currentRun.frag.attributes.background
        backgroundStart = true
      }

      if (underlineStart) {
        if (currentRun.frag.attributes.color !== underlineRange.color || !currentRun.frag.attributes.underline) {
          underlineRange.end = currentRun.x
          this.underlineList.push(underlineRange)
          underlineStart = false
          underlineRange = { start: startX, end: 0, posY: this.calClearPosY(underlinePosY), color: '' }
          if (currentRun.frag.attributes.underline !== FragmentDefaultAttributes.underline) {
            underlineRange.start = currentRun.x
            underlineRange.color = currentRun.frag.attributes.color
            underlineStart = true
          }
        }
      } else if (currentRun.frag.attributes.underline !== FragmentDefaultAttributes.underline) {
        underlineRange.start = currentRun.x
        underlineRange.color = currentRun.frag.attributes.color
        underlineStart = true
      }

      if (composingUnderlineStart) {
        if (!(currentRun.frag instanceof FragmentText) || !currentRun.frag.attributes.composing) {
          composingUnderlineRange.end = currentRun.x
          this.composingUnderline.push(composingUnderlineRange)
          composingUnderlineStart = false
          composingUnderlineRange = { start: startX, end: 0, posY: this.calClearPosY(underlinePosY) }
        }
      } else if (currentRun.frag.attributes.composing) {
        composingUnderlineRange.start = currentRun.x
        composingUnderlineStart = true
      }

      if (strikeStart) {
        if (currentRun.frag !== strikeFrag) {
          strikeRange.end = currentRun.x
          this.strikeList.push(strikeRange)
          strikeStart = false
          strikeFrag = null
          strikeRange = { start: startX, end: 0, posY: 0.5, color: '' }
          if (currentRun.frag.attributes.strike !== FragmentDefaultAttributes.strike) {
            strikeRange.start = currentRun.x
            strikeRange.color = currentRun.frag.attributes.color
            strikeRange.posY = this.calClearPosY(
              this.y + this.baseline - (currentRun.frag.metrics.baseline - currentRun.frag.metrics.xTop) / 2,
            )
            strikeStart = true
            strikeFrag = currentRun.frag
          }
        }
      } else if (currentRun.frag.attributes.strike !== FragmentDefaultAttributes.strike) {
        strikeRange.start = currentRun.x
        strikeRange.color = currentRun.frag.attributes.color
        strikeRange.posY = this.calClearPosY(
          this.y + this.baseline - (currentRun.frag.metrics.baseline - currentRun.frag.metrics.xTop) / 2,
        )
        strikeStart = true
        strikeFrag = currentRun.frag
      }

      currentRun = currentRun.nextSibling
    }

    if (backgroundStart) {
      backgroundRange.end = this.tail!.x + this.tail!.width
      this.backgroundList.push(backgroundRange)
    }
    if (underlineStart) {
      underlineRange.end = this.tail!.x + this.tail!.width
      this.underlineList.push(underlineRange)
    }
    if (composingUnderlineStart) {
      composingUnderlineRange.end = this.tail!.x + this.tail!.width
      this.composingUnderline.push(composingUnderlineRange)
    }
    if (strikeStart) {
      strikeRange.end = this.tail!.x + this.tail!.width
      this.strikeList.push(strikeRange)
    }

    if (this.tail !== null) {
      this.setSize(this.height, this.tail.x + this.tail.width)
    }
  }

  public getChildrenStackByPos(x: number, y: number): Array<IRenderStructure> {
    const res: Array<IRenderStructure> = [this]
    const child = findRectChildInPos(x, y, this.children, false)
    if (child) {
      res.push(child)
    }
    return res
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.Default
  }

  // #region ILinkedList methods
  public add(node: Run): void {
    throw new Error('Method not implemented.')
  }
  public addAfter(node: Run, target: Run): void {
    throw new Error('Method not implemented.')
  }
  public addBefore(node: Run, target: Run): void {
    throw new Error('Method not implemented.')
  }
  public addAtIndex(node: Run, index: number): void {
    throw new Error('Method not implemented.')
  }
  public addAll(nodes: Run[]): void {
    throw new Error('Method not implemented.')
  }
  public removeAll(): Run[] {
    throw new Error('Method not implemented.')
  }
  public remove(node: Run): void {
    throw new Error('Method not implemented.')
  }
  public removeAllFrom(node: Run): Run[] {
    throw new Error('Method not implemented.')
  }
  public splice(start: number, deleteCount: number, nodes?: Run[] | undefined): Run[] {
    return []
  }
  public findIndex(node: Run): void {
    throw new Error('Method not implemented.')
  }
  // #endregion

  // #region IPointerInteractive methods
  public onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerLeave(): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerDown(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerUp(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  public onPointerTap(x: number, y: number): void {
    throw new Error('Need IPointerInteractiveDecorator to implement.')
  }
  // #endregion

  public bubbleUp(type: string, data: any, stack: any[]) {
    if (this.parent) {
      stack.push(this)
      this.parent.bubbleUp(type, data, stack)
    }
  }

  public getAbsolutePos(): ICoordinatePos | null {
    const parentPos = this.parent?.getAbsolutePos()
    if (parentPos) {
      parentPos.x += this.x
      parentPos.y += this.y
      return parentPos
    } else {
      return null
    }
  }

  /**
   * 设置当前行的 size 并触发 LINE_CHANGE_SIZE 事件
   */
  private setSize(height: number, width: number) {
    this.width = width
    this.height = Math.max(this.minHeight, height)
    this.bubbleUp(BubbleMessage.LINE_CHANGE_SIZE, { width: this.width, height: this.height }, [this])
  }

  /**
   * 设置当前行的 baseline 位置
   */
  private setBaseline(baseline: number) {
    this.baseline = Math.max(baseline, this.minBaseline)
  }

  /**
   * 根据原始 y 坐标计算出一个可以在高分屏上清晰绘制的 y 坐标
   * @param posY 原始 y 坐标
   */
  private calClearPosY(posY: number) {
    // 在高分屏上，如果 y 坐标时一个整数，在这个坐标上绘制一条水平方向的直线
    // 这条直接就是模糊的，所以需要向下取整让加上 0.5 使得这条直线变清晰
    return Math.floor(posY) + 0.5
  }
}
