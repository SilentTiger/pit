import DocContent from './DocContent'
import ICanvasContext from '../Common/ICanvasContext'
import Block from './Block'
import IRange from '../Common/IRange'
import { ISearchResult } from '../Common/ISearchResult'
import { EventName } from '../Common/EnumEventName'
import Delta from 'quill-delta-enhanced'
import { isPointInRectangle, findRectChildInPos, findRectChildInPosY } from '../Common/util'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import { requestIdleCallback } from '../Common/Platform'
import { DocPos } from '../Common/DocPos'

export default class Document extends DocContent {
  private firstScreenRender = 0;
  private initLayout = false;
  private idleLayoutStartBlock: Block | null = null;
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private searchKeywords: string = '';
  private searchResults: ISearchResult[] = [];
  private searchResultCurrentIndex: number | undefined = undefined;

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
    const viewportPosEnd = scrollTop + viewHeight
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
        this.startIdleLayout(current)
        this.endDrawingBlock = current
        break
      }
      current = current.nextSibling
    }
    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0) {
      if (hasLayout) {
        // 如果有内容排版过，就立刻重新搜索一次，这样本次绘制的就是最新的正确内容
        // 这里如果放到下一帧再绘制搜索结果，搜索结果会闪烁，用户体验不好
        this.search(this.searchKeywords, false)
      }
      if (this.searchResults.length > 0) {
        const startIndex = this.findStartSearchResult(this.searchResults, scrollTop)
        ctx.drawSearchResult(this.searchResults, scrollTop, scrollTop + viewHeight, startIndex, this.searchResultCurrentIndex)
      }
    }
    ctx.restore()
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
        if (isPointInRectangle(0, scrollTop, element)) {
          current = element
          break
        }
      }
    } else {
      current = findRectChildInPos(0, scrollTop, this.children)
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
    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0 && this.searchResults.length > 0) {
      const startIndex = this.findStartSearchResult(this.searchResults, scrollTop)
      ctx.drawSearchResult(this.searchResults, scrollTop, scrollTop + viewHeight, startIndex, this.searchResultCurrentIndex)
    }
    ctx.restore()
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

  /**
   * 搜索，返回所有搜索结果的 index
   * @param trigger 是否触发事件
   */
  public search(keywords: string, trigger = true): ISearchResult[] {
    this.searchKeywords = keywords
    const res: ISearchResult[] = []
    for (let blockIndex = 0; blockIndex < this.children.length; blockIndex++) {
      const block = this.children[blockIndex]
      const searchResult = block.search(keywords)
      if (searchResult.length > 0) {
        res.push(...searchResult)
      }
    }
    this.searchResults = res

    if (res.length > 0) {
      if (this.searchResultCurrentIndex === undefined || this.searchResultCurrentIndex >= res.length) {
        this.searchResultCurrentIndex = 0
      }
    } else {
      this.searchResultCurrentIndex = undefined
    }

    if (trigger) {
      this.em.emit(EventName.DOCUMENT_CHANGE_SEARCH_RESULT,
        this.searchResults,
        this.searchResultCurrentIndex,
      )
    }
    return res
  }

  /**
   * 指定当前搜索结果的索引（在搜索结果中点击‘上一项’、‘下一项’的时候用）
   */
  public setSearchResultCurrentIndex(index: number) {
    index = Math.max(0, index)
    index = Math.min(this.searchResults.length - 1, index)
    this.searchResultCurrentIndex = index
    this.em.emit(EventName.DOCUMENT_CHANGE_SEARCH_RESULT,
      this.searchResults,
      this.searchResultCurrentIndex,
    )
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false): Delta {
    if (this.searchResults.length <= 0 || this.searchResultCurrentIndex === undefined) { return new Delta() }
    let res: Delta = new Delta()
    let resetStart: Block | undefined
    if (all) {
      let currentBlock = this.tail
      for (let i = this.searchResults.length - 1; i >= 0; i--) {
        const targetResult = this.searchResults[i]
        while (currentBlock) {
          if (currentBlock.start <= targetResult.pos) {
            const ops = currentBlock.replace(targetResult.pos - currentBlock.start, this.searchKeywords.length, replaceWords)
            if (currentBlock.start > 0) {
              ops.unshift({ retain: currentBlock.start })
            }
            res = res.compose(new Delta(ops))
            break
          } else {
            currentBlock = currentBlock.prevSibling
          }
        }
      }
      resetStart = currentBlock!
    } else {
      const targetResult = this.searchResults[this.searchResultCurrentIndex]
      const blocks = this.findBlocksByRange(targetResult.pos, this.searchKeywords.length)
      if (blocks.length > 0) {
        const ops = blocks[0].replace(targetResult.pos - blocks[0].start, this.searchKeywords.length, replaceWords)
        resetStart = resetStart || blocks[0]

        if (blocks[0].start > 0) {
          ops.unshift({ retain: blocks[0].start })
        }
        res = new Delta(ops)
      }
    }
    if (resetStart) {
      resetStart.setStart(resetStart.start, true, true)
    }
    this.search(this.searchKeywords)
    return res
  }

  /**
   * 清除搜索状态
   */
  public clearSearch() {
    this.searchResults.length = 0
    this.searchKeywords = ''
    this.searchResultCurrentIndex = undefined
    this.em.emit(EventName.DOCUMENT_CHANGE_SEARCH_RESULT,
      this.searchResults,
      this.searchResultCurrentIndex,
    )
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

  /**
   * 查找从第几个结果开始绘制搜索结果
   */
  private findStartSearchResult(searchResults: ISearchResult[], scrollTop: number): number {
    let low = 0
    let high = searchResults.length - 1

    let mid = Math.floor((low + high) / 2)
    while (high > low + 1) {
      const midValue = searchResults[mid].rects[0].y
      if (midValue <= scrollTop) {
        low = mid
      } else if (midValue > scrollTop) {
        high = mid
      }
      mid = Math.floor((low + high) / 2)
    }

    for (; mid >= 0; mid--) {
      if (searchResults[mid].rects[0].y + searchResults[mid].rects[0].height < scrollTop) {
        break
      }
    }
    mid = Math.max(mid, 0)

    return mid
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
      let currentBlock: Block | undefined | null = this.idleLayoutStartBlock
      this.idleLayoutStartBlock = null
      let hasLayout = false // 这个变量用来几个当前这个 idleLayout 过程中是否有 block 排过版
      while (deadline.timeRemaining() > 5 && currentBlock !== undefined && currentBlock !== null) {
        if (currentBlock.needLayout) {
          hasLayout = hasLayout || currentBlock.needLayout
          currentBlock.layout()
        }
        currentBlock = currentBlock.nextSibling
      }

      // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
      if (this.searchKeywords.length > 0 && hasLayout) {
        // 这里重新搜索但不触发绘制逻辑，因为这里是可视区域外的内容，暂时不用绘制
        this.search(this.searchKeywords, false)
      }

      if (currentBlock !== null && currentBlock !== undefined) {
        // 说明还没有排版完成
        this.idleLayoutStartBlock = currentBlock
        // 如果初次排版都没有完成，就要更新一次文档高度
        if (this.initLayout === false) {
          this.setContentHeight(currentBlock.y)
        }
      }
      requestIdleCallback(this.runIdleLayout)
    } else {
      this.idleLayoutRunning = false
      this.initLayout = true
      console.log('idle finished', performance.now() - (window as any).start)
    }
  }
}
