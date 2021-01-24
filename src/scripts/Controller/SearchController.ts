// 搜索结果会经常因为一些外部事件而变化，已知有以下事件会导致搜索结果的自动变化
// 手动触发搜索，手动 replace，文档内容被当前用户修改，文档完成 layout 或文档完成 idleLayout

import EventEmitter from 'eventemitter3'
import Document from '../DocStructure/Document'
import { ISearchResult } from '../Common/ISearchResult'
import { EventName } from '../Common/EnumEventName'
import ICanvasContext from '../Common/ICanvasContext'
import Delta from 'quill-delta-enhanced'

export default class SearchController {
  public em = new EventEmitter()
  public searchKeywords = '';
  public searchResults: ISearchResult[] = [];
  public searchResultCurrentIndex: number | undefined = undefined;
  private doc: Document

  constructor(doc: Document) {
    this.doc = doc
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_LAYOUT, this.onDocumentLayout)
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_IDLE_LAYOUT, this.onDocumentIdleLayout)
    this.doc.em.addListener(EventName.DOCUMENT_AFTER_DRAW, this.onDocumentFastDraw)
  }

  public getSearchResult() {
    return this.searchResults
  }

  public search(keywords: string, keepIndex = false): ISearchResult[] {
    this.searchKeywords = keywords
    this.searchResults = this.doc.search(keywords)
    if (this.searchResults.length > 0) {
      if (keepIndex) {
        const oldIndex = this.searchResultCurrentIndex ?? 0
        this.searchResultCurrentIndex = Math.min(oldIndex, this.searchResults.length - 1)
      } else {
        this.searchResultCurrentIndex = 0
      }
    } else {
      this.searchResultCurrentIndex = undefined
    }
    this.em.emit(EventName.SEARCH_RESULT_CHANGE, this.searchResults, this.searchResultCurrentIndex)
    return this.searchResults
  }

  /**
   * 指定当前搜索结果的索引（在搜索结果中点击‘上一项’、‘下一项’的时候用）
   */
  public setSearchResultCurrentIndex(index: number) {
    this.searchResultCurrentIndex = Math.max(0, index)
    this.searchResultCurrentIndex = Math.min(this.searchResults.length - 1, this.searchResultCurrentIndex)
  }

  /**
   * 清除搜索状态
   */
  public clearSearch() {
    this.searchResults.length = 0
    this.searchKeywords = ''
    this.searchResultCurrentIndex = undefined
    this.em.emit(EventName.SEARCH_RESULT_CHANGE, this.searchResults, this.searchResultCurrentIndex)
  }

  public nextSearchResult(): { index: number, res: ISearchResult } | null {
    let res: { index: number, res: ISearchResult } | null = null
    if (this.searchResults.length > 0) {
      this.searchResultCurrentIndex = this.searchResultCurrentIndex || 0
      let newIndex = this.searchResultCurrentIndex + 1
      if (newIndex >= this.searchResults.length) {
        newIndex = 0
      }
      this.setSearchResultCurrentIndex(newIndex)
      const targetResult = this.searchResults[newIndex]
      res = {
        index: newIndex,
        res: targetResult,
      }
    } else {
      res = null
    }
    this.em.emit(EventName.SEARCH_NEED_DRAW)
    return res
  }

  public prevSearchResult(): { index: number, res: ISearchResult } | null {
    let res: { index: number, res: ISearchResult } | null = null
    if (this.searchResults.length > 0) {
      this.searchResultCurrentIndex = this.searchResultCurrentIndex || 0
      let newIndex = this.searchResultCurrentIndex - 1
      if (newIndex < 0) {
        newIndex = this.searchResults.length - 1
      }
      this.setSearchResultCurrentIndex(newIndex)
      const targetResult = this.searchResults[newIndex]
      res = {
        index: newIndex,
        res: targetResult,
      }
    } else {
      res = null
    }
    this.em.emit(EventName.SEARCH_NEED_DRAW)
    return res
  }

  public replace(replaceWords: string, all = false): Delta {
    if (typeof this.searchResultCurrentIndex === 'number' && this.searchResults.length > 0) {
      const toReplaceResults = all ? this.searchResults : [this.searchResults[this.searchResultCurrentIndex]]
      const res = this.doc.replace(toReplaceResults, this.searchKeywords.length, replaceWords)
      // 替换之后要重新搜索
      this.search(this.searchKeywords, true)
      return res
    } else {
      return new Delta()
    }
  }

  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    const startIndex = this.findStartSearchResult(this.searchResults, scrollTop)
    ctx.drawSearchResult(this.searchResults, scrollTop, scrollTop + viewHeight, startIndex, this.searchResultCurrentIndex)
  }

  private onDocumentLayout = ({ hasLayout, ctx, scrollTop, viewHeight }: { hasLayout: boolean, ctx: ICanvasContext, scrollTop: number, viewHeight: number }) => {
    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0) {
      if (hasLayout) {
        // 如果有内容排版过，就立刻重新搜索一次，这样本次绘制的就是最新的正确内容
        // 这里如果放到下一帧再绘制搜索结果，搜索结果会闪烁，用户体验不好
        this.search(this.searchKeywords, true)
      }
      if (this.searchResults.length > 0) {
        this.draw(ctx, scrollTop, viewHeight)
      }
    }
  }

  private onDocumentIdleLayout = ({ hasLayout }: { hasLayout: boolean }) => {
    // idle layout
    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0 && hasLayout) {
      // 这里重新搜索但不触发绘制逻辑，因为这里是可视区域外的内容，暂时不用绘制
      this.search(this.searchKeywords, true)
    }
  }

  private onDocumentFastDraw = ({ ctx, scrollTop, viewHeight }: { ctx: ICanvasContext, scrollTop: number, viewHeight: number }) => {
    // fast draw
    // 如果当前处于搜索状态，就判断文档内容重新排版过就重新搜索，否则只重绘搜索结果
    if (this.searchKeywords.length > 0 && this.searchResults.length > 0) {
      this.draw(ctx, scrollTop, viewHeight)
    }
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
}
