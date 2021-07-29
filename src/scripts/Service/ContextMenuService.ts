import IRangeNew from '../Common/IRangeNew'
import { findChildIndexInDocPos, getRelativeDocPos } from '../Common/util'
import Block from '../DocStructure/Block'
import DocContent from '../DocStructure/DocContent'
import Document from '../DocStructure/Document'

interface IContextMenuItemConfig {
  group: string
  disabled: boolean
  name: string
}

type IContextMenuConfig = IContextMenuItemConfig[]

export default class ContextMenuService {
  private doc: Document

  constructor(doc: Document) {
    this.doc = doc
  }

  public getContextMenuConfig(selection: IRangeNew[]): IContextMenuConfig {
    return this.getDocContentContextMenuConfig(this.doc, selection)
  }

  public getContextMenuConfigIntersection(config: IContextMenuItemConfig[][]): IContextMenuItemConfig[] {
    throw new Error('not implemented')
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
    // 这里根据不同的 block 类型调用相应的方法获取各个 block 的 context config
    throw new Error('not implemented')
  }
}
