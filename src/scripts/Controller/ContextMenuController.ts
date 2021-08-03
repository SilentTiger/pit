import IRangeNew from '../Common/IRangeNew'
import { findChildIndexInDocPos, getRelativeDocPos } from '../Common/util'
import Block from '../DocStructure/Block'
import BlockCommon from '../DocStructure/BlockCommon'
import DocContent from '../DocStructure/DocContent'
import ListItem from '../DocStructure/ListItem'
import Paragraph from '../DocStructure/Paragraph'
import QuoteBlock from '../DocStructure/QuoteBlock'
import Table from '../DocStructure/Table'
import Controller from './Controller'

enum EnumContextMenuGroup {
  Basic,
  Image,
  LayoutFrame,
  Table,
  OrderedList,
}

enum EnumBasicContextMenuItems {
  Cut,
  Copy,
  Paste,
}
enum EnumImageContextMenuItems {
  OpenInNewTab,
}
enum EnumLayoutFrameContextMenuItems {
  Alignments,
}
enum EnumTableContextMenuItems {
  InsertRowBefore,
  InsertRowAfter,
  InsertColumnBefore,
  InsertColumnAfter,
  MergeCells,
  UnmergeCells,
}
enum EnumOrderedListContextMenuItems {
  ResetOrder,
}

interface IContextMenuItemConfig {
  group: string
  disabled: boolean
  name: string
}

type IContextMenuConfig = IContextMenuItemConfig[]

export default class ContextMenuController extends Controller {
  public getContextMenuConfig(selection: IRangeNew[]): IContextMenuConfig {
    return this.getDocContentContextMenuConfig(this.doc, selection)
  }

  public getContextMenuConfigIntersection(config: IContextMenuItemConfig[][]): IContextMenuItemConfig[] {
    throw new Error('Not implemented')
  }

  public getDocContentContextMenuConfig(doc: DocContent, selection: IRangeNew[]): IContextMenuConfig {
    // 对于同一个 DocContent 中不同的 block 的 context menu，只取交集，对于嵌套的结构取并集
    const pararellContextConfig: IContextMenuItemConfig[][] = []
    // 先找出所有受影响的 block
    selection.forEach((range) => {
      const { start, end } = range
      const startBlockIndex = findChildIndexInDocPos(start.index, doc.children)
      const endBlockIndex = findChildIndexInDocPos(end.index, doc.children)
      if (startBlockIndex >= 0 && endBlockIndex >= 0) {
        if (startBlockIndex !== endBlockIndex) {
          for (let blockIndex = startBlockIndex; blockIndex <= endBlockIndex; blockIndex++) {
            const block = doc.children[blockIndex]
            if (blockIndex === startBlockIndex) {
              const contextConfig = this.getBlockContextMenuConfig(block, {
                start: getRelativeDocPos(block.start, start),
                end: { index: block.length, inner: null },
              })
              pararellContextConfig.push(contextConfig)
            } else if (blockIndex === endBlockIndex) {
              const contextConfig = this.getBlockContextMenuConfig(block, {
                start: { index: 0, inner: null },
                end: getRelativeDocPos(block.start, end),
              })
              pararellContextConfig.push(contextConfig)
            } else {
              const contextConfig = this.getBlockContextMenuConfig(block, {
                start: { index: 0, inner: null },
                end: { index: block.length, inner: null },
              })
              pararellContextConfig.push(contextConfig)
            }
          }
        } else {
          const targetBlock = doc.children[startBlockIndex]
          const contextConfig = this.getBlockContextMenuConfig(targetBlock, {
            start: getRelativeDocPos(targetBlock.start, start),
            end: getRelativeDocPos(targetBlock.start, end),
          })
          pararellContextConfig.push(contextConfig)
        }
      }
    })
    return this.getContextMenuConfigIntersection(pararellContextConfig)
  }

  public getBlockContextMenuConfig(block: Block, range: IRangeNew): IContextMenuItemConfig[] {
    // 这里根据不同的 block 类型调用相应的方法获取各个 block 的 context menu config
    if (block instanceof Paragraph) {
      return this.getParagraphContextMenuConfig(block, range)
    } else if (block instanceof QuoteBlock) {
      return this.getQuoteBlockContextMenuConfig(block, range)
    } else if (block instanceof ListItem) {
      return this.getListItemContextMenuConfig(block, range)
    } else if (block instanceof Table) {
      return this.getTableContextMenuConfig(block, range)
    } else {
      return []
    }
  }

  public getBlockCommonContextMenuConfig(block: BlockCommon, range: IRangeNew): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getParagraphContextMenuConfig(paragraph: Paragraph, range: IRangeNew): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getQuoteBlockContextMenuConfig(paragraph: QuoteBlock, range: IRangeNew): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getListItemContextMenuConfig(listItem: ListItem, range: IRangeNew): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getTableContextMenuConfig(table: Table, range: IRangeNew): IContextMenuConfig {
    throw new Error('Not implemented')
  }
}
