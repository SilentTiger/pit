import Delta from 'quill-delta-enhanced'
import Op from 'quill-delta-enhanced/dist/Op'
import Document from '../DocStructure/Document'
import IRangeNew from '../Common/IRangeNew'
import Block from '../DocStructure/Block'
import Paragraph from '../DocStructure/Paragraph'
import LayoutFrame from '../DocStructure/LayoutFrame'
import ListItem from '../DocStructure/ListItem'
import QuoteBlock from '../DocStructure/QuoteBlock'
import { EventName } from '../Common/EnumEventName'
import { compareDocPos, findChildrenByRange, findChildInDocPos } from '../Common/util'
import BlockCommon from '../DocStructure/BlockCommon'

export default class SearchController {
  private doc: Document

  constructor(doc: Document) {
    this.doc = doc
  }

  /**
   * 删除操作，删除选区范围的内容并将选区长度置为 0
   * @param forward true: 向前删除，相当于退格键； false：向后删除，相当于 win 上的 del 键
   */
  public delete(selection: IRangeNew[], forward: boolean = true): void {
    // todo
  }
}
