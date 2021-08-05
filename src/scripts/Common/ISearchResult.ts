import type IRectangle from './IRectangle'
import type { DocPos } from './DocPos'

export interface ISearchResult {
  pos: DocPos
  rects: IRectangle[]
}
