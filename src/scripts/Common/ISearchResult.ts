import IRectangle from './IRectangle'
import { DocPos } from './DocPos'

export interface ISearchResult {
  pos: DocPos;
  rects: IRectangle[];
}
