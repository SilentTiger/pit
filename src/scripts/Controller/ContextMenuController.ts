import type IRange from '../Common/IRange'
import { findChildIndexInDocPos } from '../Common/util'
import type Block from '../Block/Block'
import type BlockCommon from '../Block/BlockCommon'
import type DocContent from '../Document/DocContent'
import ListItem from '../Block/ListItem'
import Paragraph from '../Block/Paragraph'
import QuoteBlock from '../Block/QuoteBlock'
import Table from '../Block/Table'
import Controller from './Controller'
import { getRelativeDocPos } from '../Common/DocPos'

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
  public getContextMenuConfig(selection: IRange[]): IContextMenuConfig {
    return this.getDocContentContextMenuConfig(this.doc, selection)
  }

  public getContextMenuConfigIntersection(config: IContextMenuItemConfig[][]): IContextMenuItemConfig[] {
    throw new Error('Not implemented')
  }

  public getDocContentContextMenuConfig(doc: DocContent, selection: IRange[]): IContextMenuConfig {
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

  public getBlockContextMenuConfig(block: Block, range: IRange): IContextMenuItemConfig[] {
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

  public getBlockCommonContextMenuConfig(block: BlockCommon, range: IRange): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getParagraphContextMenuConfig(paragraph: Paragraph, range: IRange): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getQuoteBlockContextMenuConfig(paragraph: QuoteBlock, range: IRange): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getListItemContextMenuConfig(listItem: ListItem, range: IRange): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  public getTableContextMenuConfig(table: Table, range: IRange): IContextMenuConfig {
    throw new Error('Not implemented')
  }

  /**
   * getContextMenu
   */
  public getContextMenu() {
    // for (let layerIndex = 0; layerIndex < Math.min(...stacks.map((s) => s.length)); layerIndex++) {
    //   const tempRes = [stacks[0][layerIndex]]
    //   let interrupt = false
    //   for (let stackIndex = 1; stackIndex < stacks.length; stackIndex++) {
    //     const currentStack = stacks[stackIndex]
    //     if (
    //       currentStack[layerIndex].length === 1 &&
    //       stacks[0][layerIndex].length === 1 &&
    //       currentStack[layerIndex][0] === stacks[0][layerIndex][0]
    //     ) {
    //       tempRes.push(currentStack[layerIndex])
    //     } else {
    //       const tempSet = new Set()
    //       currentStack[layerIndex].forEach((item) => tempSet.add(item))
    //       stacks[0][layerIndex].forEach((item) => tempSet.add(item))
    //       tempRes.push(Array.from(tempSet))
    //       interrupt = true
    //     }
    //   }
    //   res.push(...tempRes)
    //   if (interrupt) {
    //     break
    //   }
    // }
  }
}
