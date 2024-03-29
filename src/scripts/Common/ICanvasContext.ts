import type IRectangle from './IRectangle'
import type { ISearchResult } from './ISearchResult'

export default interface ICanvasContext extends CanvasRenderingContext2D {
  drawCursor(x: number, y: number, height: number, color: string): void
  drawSelectionArea(rects: IRectangle[], scrollTop: number, viewEnd: number, startIndex: number): void
  drawSearchResult(
    results: ISearchResult[],
    scrollTop: number,
    viewEnd: number,
    startIndex: number,
    currentIndex?: number,
  ): void
}
