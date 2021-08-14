import DocContent from './DocContent'
import type ICanvasContext from '../Common/ICanvasContext'
import type Block from './Block'
import { EventName } from '../Common/EnumEventName'
import type Delta from 'quill-delta-enhanced'
import { findRectChildInPosY, hasIntersection } from '../Common/util'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import type { DocPos } from '../Common/DocPos'
import type ICoordinatePos from '../Common/ICoordinatePos'
import { getPlatform } from '../Platform'

export default class Document extends DocContent {
  private firstScreenRender = 0
  private initLayout = false
  private idleLayoutStartBlock: Block | null = null
  private idleLayoutRunning = false

  private startDrawingBlock: Block | null = null
  private endDrawingBlock: Block | null = null

  public readFromChanges(delta: Delta) {
    this.firstScreenRender = 0
    super.readFromChanges(delta)
  }

  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    this.startDrawingBlock = null
    this.endDrawingBlock = null
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.save()
    let current = this.head
    if (current) {
      current.setPositionY(this.paddingTop)
    }
    const viewportPosEnd = scrollTop + viewHeight
    let needIdleLayout = false
    let hasLayout = false // 这个变量用来记录整个绘制过程中是否有 block 需要排版
    // 绘制的主要逻辑是，当前视口前面的内容只用排版不用绘制
    // 当前视口中的内容排版并绘制
    // 当前视口后面的内容，放到空闲队列里面排版
    while (current !== null) {
      if (current.y < viewportPosEnd) {
        hasLayout = hasLayout || current.needLayout
        current.layout()
        if (current.y + current.height >= scrollTop) {
          current.draw(ctx, 0, -scrollTop, viewHeight - current.y + scrollTop)
          if (this.startDrawingBlock === null) {
            this.startDrawingBlock = current
          }
        }
      } else if (current.needLayout) {
        if (this.firstScreenRender === 0) {
          this.firstScreenRender = window.performance.now() - (window as any).start
          console.log('first screen finished ', this.firstScreenRender)
        }
        // 当前视口后面的内容，放到空闲队列里面排版
        needIdleLayout = true
        this.startIdleLayout(current)
        this.endDrawingBlock = current
        break
      }
      current = current.nextSibling
    }
    ctx.restore()
    this.em.emit(EventName.DOCUMENT_AFTER_LAYOUT, { hasLayout, needIdleLayout, ctx, scrollTop, viewHeight })
    if (!needIdleLayout) {
      this.em.emit(EventName.DOCUMENT_LAYOUT_FINISH, { hasLayout, ctx, scrollTop, viewHeight })
    }
  }

  /**
   * 快速绘制，不包括排版等逻辑
   */
  public fastDraw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    this.startDrawingBlock = null
    this.endDrawingBlock = null
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.save()
    let current: Block | null = null
    // 如果 idleLayout 在执行过程中，说明有的 block 还没有被正确设置 y 坐标，此时不能直接用二分法查找目标 block，
    // 否可可能会拿到错误的 block，需要降级为从头遍历找目标 block
    // 这里应该不需要担心绘制的内容在需要排版的 block 后面，因为可视区域如果在需要排版的元素后面不会走 fastDraw 的逻辑
    if (this.idleLayoutRunning) {
      for (let childIndex = 0; childIndex < this.children.length; childIndex++) {
        const element = this.children[childIndex]
        if (hasIntersection(element.y, element.y + element.height, scrollTop, scrollTop + viewHeight)) {
          current = element
          break
        }
      }
    } else {
      current = findRectChildInPosY(scrollTop, this.children)
      // 如果这里 current 没有找到有可能是因为 document 有 paddingTop，导致第一个元素的 y < scrollTop
      if (!current) {
        current = this.head
      }
    }
    if (current) {
      const viewportPosEnd = scrollTop + viewHeight
      this.startDrawingBlock = current
      while (current) {
        if (current.y < viewportPosEnd) {
          current.draw(ctx, 0, -scrollTop, viewHeight - current.y + scrollTop)
          this.endDrawingBlock = current
        } else {
          break
        }
        current = current.nextSibling
      }
    }
    ctx.restore()
    this.em.emit(EventName.DOCUMENT_AFTER_DRAW, { ctx, scrollTop, viewHeight })
  }

  public getDocumentPos(x: number, y: number, start = false): DocPos | null {
    let targetChild
    if (y < 0) {
      targetChild = this.head
    } else if (y > this.height) {
      targetChild = this.tail
    } else {
      // 如果在异步排版过程中，就不能用二分查找
      targetChild = findRectChildInPosY(y, this.children, this.idleLayoutStartBlock === null)
    }
    if (targetChild === null) {
      return null
    }
    const childPos = targetChild.getDocumentPos(x, y, start)
    if (childPos !== null) {
      childPos.index += targetChild.start
    }
    return childPos
  }

  public setHeight(height: number) {
    const targetHeight = Math.ceil(height)
    if (targetHeight >= this.contentHeight && targetHeight !== this.height) {
      this.height = targetHeight
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    }
  }

  public setWidth(width: number) {
    super.setWidth(width)
    this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    this.em.emit(EventName.DOCUMENT_NEED_LAYOUT)
  }

  public bubbleUp(type: string, data: any, stack?: any[]): void {
    switch (type) {
      case BubbleMessage.NEED_LAYOUT: {
        // 如果子元素声明需要重新排版，那么 stack 中最后一个元素就肯定是需要排版的 block
        const target = Array.isArray(stack) ? (stack[stack.length - 1] as Block) : null
        if (target && (!this.idleLayoutStartBlock || this.idleLayoutStartBlock.start > target.start)) {
          this.idleLayoutStartBlock = target
          this.em.emit(EventName.DOCUMENT_NEED_LAYOUT)
        }
        return
      }
      case BubbleMessage.CONTENT_CHANGE: {
        this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
        return
      }
      case BubbleMessage.NEED_DRAW: {
        this.em.emit(EventName.DOCUMENT_NEED_DRAW)
        return
      }
      default: {
        const bubbleStack = stack instanceof Array ? [...stack, this] : [this]
        this.em.emit(type, data, bubbleStack)
      }
    }
  }

  /**
   * 开始 idle layout
   * @param block layout 起始 block
   */
  private startIdleLayout(block: Block) {
    if (!this.idleLayoutStartBlock || block.start < this.idleLayoutStartBlock.start) {
      this.idleLayoutStartBlock = block
      if (!this.idleLayoutRunning) {
        getPlatform().requestIdleCallback(this.runIdleLayout)
      }
    }
  }

  private runIdleLayout = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => {
    if (this.idleLayoutStartBlock) {
      this.idleLayoutRunning = true
      let hasLayout = false // 这个变量用来几个当前这个 idleLayout 过程中是否有 block 排过版
      while (deadline.timeRemaining() > 5 && this.idleLayoutStartBlock) {
        if (this.idleLayoutStartBlock.needLayout) {
          hasLayout = hasLayout || this.idleLayoutStartBlock.needLayout
          this.idleLayoutStartBlock.layout()
        }
        this.idleLayoutStartBlock = this.idleLayoutStartBlock.nextSibling
      }
      this.em.emit(EventName.DOCUMENT_AFTER_IDLE_LAYOUT, {
        hasLayout,
        needIdleLayout: this.idleLayoutStartBlock !== null,
      })
      if (this.idleLayoutStartBlock) {
        // 说明还没有排版完成
        // 如果初次排版都没有完成，就要更新一次文档高度
        if (this.initLayout === false) {
          this.setContentHeight(this.idleLayoutStartBlock.y)
        }
        getPlatform().requestIdleCallback(this.runIdleLayout)
      } else {
        this.idleLayoutRunning = false
        this.initLayout = true
        console.log('idle finished', performance.now() - (window as any).start)
        // 说明全文排版完成
        this.em.emit(EventName.DOCUMENT_LAYOUT_FINISH, { hasLayout })
      }
    }
  }
}
