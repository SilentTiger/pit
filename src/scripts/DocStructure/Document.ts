import DocContent from './DocContent'
import ICanvasContext from '../Common/ICanvasContext'
import Block from './Block'
import IRange from '../Common/IRange'
import { ISearchResult } from '../Common/ISearchResult'
import { EventName } from '../Common/EnumEventName'
import Delta from 'quill-delta-enhanced'
import { findRectChildInPosY, hasIntersection } from '../Common/util'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import { requestIdleCallback } from '../Common/Platform'
import { DocPos } from '../Common/DocPos'
import ICoordinatePos from '../Common/ICoordinatePos'

export default class Document extends DocContent {
  private firstScreenRender = 0;
  private initLayout = false;
  private idleLayoutStartBlock: Block | null = null;
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

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
          current.draw(ctx, 0, -scrollTop, viewHeight)
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
    this.em.emit(EventName.DOCUMENT_AFTER_LAYOUT, { hasLayout, needIdleLayout })
    if (!needIdleLayout) {
      this.em.emit(EventName.DOCUMENT_LAYOUT_FINISH)
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
          current.draw(ctx, 0, -scrollTop, viewHeight)
          this.endDrawingBlock = current
        } else {
          break
        }
        current = current.nextSibling
      }
    }
    ctx.restore()
    this.em.emit(EventName.DOCUMENT_AFTER_DRAW)
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
    if (targetChild === null) { return null }
    const childPos = targetChild.getDocumentPos(x, y, start)
    if (childPos !== null) {
      childPos.index += targetChild.start
    }
    return childPos
  }

  /**
   * 设置文档选区
   * @param index 位置索引
   * @param length 选区长度
   * @param reCalRectangle 是否立刻重新计算选区矩形
   */
  public setSelection(range: IRange | null, reCalRectangle = true) {
    if (this.selection !== range) {
      if (range === null || this.selection === null) {
        this.selection = range
      } else if (this.selection.index !== range.index || this.selection.length !== range.length) {
        this.selection = {
          index: range.index,
          length: range.length,
        }
      } else {
        // 如果新的 range 的 index 和 length 和之前的一样，就 do nothing
        return
      }
      this.em.emit(EventName.CHANGE_SELECTION, this.selection)
      this.updateCurrentFormat()
    }
  }

  public getSelection(): IRange | null {
    return this.selection
  }

  public setHeight(height: number) {
    height = Math.ceil(height)
    if (height >= this.contentHeight && height !== this.height) {
      this.height = height
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    }
  }

  public setWidth(width: number) {
    super.setWidth(width)
    this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    this.em.emit(EventName.DOCUMENT_NEED_LAYOUT)
  }

  public bubbleUp(type: string, data: any, stack: any[]): void {
    if (type === BubbleMessage.NEED_LAYOUT) {
      // 如果子元素声明需要重新排版，那么 stack 中最后一个元素就肯定是需要排版的 block
      const target = stack[stack.length - 1] as Block
      if (target && (!this.idleLayoutStartBlock || this.idleLayoutStartBlock.start > target.start)) {
        this.idleLayoutStartBlock = target
        this.em.emit(EventName.DOCUMENT_NEED_LAYOUT)
      }
      return
    }
    if (type === BubbleMessage.NEED_DRAW) {
      this.em.emit(EventName.DOCUMENT_NEED_DRAW)
      return
    }
    this.em.emit(type, data, stack)
  }

  public getAbsolutePos(): ICoordinatePos {
    return {
      x: this.x,
      y: this.y,
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
        requestIdleCallback(this.runIdleLayout)
      }
    }
  }

  private runIdleLayout = (deadline: { timeRemaining: () => number, didTimeout: boolean }) => {
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
      this.em.emit(EventName.DOCUMENT_AFTER_IDLE_LAYOUT, { hasLayout, needIdleLayout: this.idleLayoutStartBlock !== null })
      if (this.idleLayoutStartBlock) {
        // 说明还没有排版完成
        // 如果初次排版都没有完成，就要更新一次文档高度
        if (this.initLayout === false) {
          this.setContentHeight(this.idleLayoutStartBlock.y)
        }
        requestIdleCallback(this.runIdleLayout)
      } else {
        // 说明全文排版完成
        this.em.emit(EventName.DOCUMENT_LAYOUT_FINISH)
      }
    } else {
      this.idleLayoutRunning = false
      this.initLayout = true
      console.log('idle finished', performance.now() - (window as any).start)
    }
  }
}
