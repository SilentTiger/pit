import * as EventEmitter from 'eventemitter3'
import replace from 'lodash/replace'
import throttle from 'lodash/throttle'
import Delta from 'quill-delta-enhanced'
import { EventName } from './Common/EnumEventName'
import ICanvasContext from './Common/ICanvasContext'
import IRange from './Common/IRange'
import { getPixelRatio } from './Common/Platform'
import { convertFormatFromSets, isPointInRectangle, increaseId, EnumIntersectionType, compareDocPos } from './Common/util'
import Document from './DocStructure/Document'
import { EnumListType } from './DocStructure/EnumListStyle'
import { IFragmentOverwriteAttributes } from './DocStructure/FragmentOverwriteAttributes'
import { HistoryStack } from './HistoryStack'
import editorConfig, { EditorConfig } from './IEditorConfig'
import WebCanvasContext from './WebCanvasContext'
import Paragraph from './DocStructure/Paragraph'
import Op from 'quill-delta-enhanced/dist/Op'
import Block from './DocStructure/Block'
import QuoteBlock from './DocStructure/QuoteBlock'
import ListItem from './DocStructure/ListItem'
import BlockCommon from './DocStructure/BlockCommon'
import IFragmentTextAttributes from './DocStructure/FragmentTextAttributes'
import LayoutFrame from './DocStructure/LayoutFrame'
import SelectionController from './Controller/SelectionController'
import TableController from './Controller/TableController'
import SearchController from './Controller/SearchController'

/**
 * 重绘类型
 */
enum RenderType {
  NoRender = 0b00,    // 不需要重绘
  FastRender = 0b01,  // 快速重绘
  Render = 0b10,      // 重拍并重绘
}

/**
 * 编辑器类
 */
export default class Editor {
  public em = new EventEmitter();
  public config: EditorConfig;
  public scrollTop: number = 0;

  private delta: Delta = new Delta();
  public cvsOffsetX: number = 0;
  /**
   * 编辑器容器 DOM 元素
   */
  public container: HTMLDivElement
  private heightPlaceholderContainer: HTMLDivElement = document.createElement('div');
  private heightPlaceholder: HTMLDivElement = document.createElement('div');
  private divCursor: HTMLDivElement = document.createElement('div');
  private textInput: HTMLTextAreaElement = document.createElement('textarea');
  private composing: boolean = false; // 输入法输入过程中，CompositionStart 将这个变量标记为 true， CompositionEnd 将这个变量标记为 false
  /**
   * 编辑器画布 DOM 元素
   */
  private cvsDoc: HTMLCanvasElement = document.createElement('canvas');
  /**
   * 编辑器画布 context 对象
   */
  public ctx: ICanvasContext = new WebCanvasContext(
    this.cvsDoc.getContext('2d') as CanvasRenderingContext2D,
  );

  private doc: Document = new Document();
  private history = new HistoryStack();

  private needRender: RenderType = RenderType.NoRender

  private compositionStartIndex: number = 0;
  private compositionStartOps: Op[] = [];
  private compositionStartRangeStart: number = 0;

  // 标记鼠标指针是否在文档区域内
  private isPointerHoverDoc: boolean = false;
  // 记录当前鼠标在文档的哪个位置
  private currentPointerScreenX: number = 0;
  private currentPointerScreenY: number = 0;

  private selectionController: SelectionController
  private tableController: TableController
  private searchController: SearchController

  private setEditorHeight = throttle((newSize) => {
    this.heightPlaceholder.style.height = newSize.height + 'px'
    this.em.emit(EventName.EDITOR_CHANGE_SIZE, newSize)
  }, 100);

  private onDocumentFormatChange = throttle((format: { [key: string]: Set<any> }) => {
    this.em.emit(EventName.EDITOR_CHANGE_FORMAT, format)
  }, 100);

  private changeCursorStatus = (() => {
    let cursorVisible = false
    let blinkTimer: number
    const setCursorVisibility = (visibility: boolean) => {
      this.divCursor.style.opacity = visibility === true ? '1' : '0'
      cursorVisible = visibility
    }
    return (status: {
      visible?: boolean,
      color?: string,
      x?: number,
      y?: number,
      height?: number,
    }) => {
      if (status.color !== undefined) { this.divCursor.style.borderLeftColor = status.color }
      if (status.x !== undefined) {
        this.divCursor.style.left = status.x + this.cvsOffsetX + 'px'
        this.textInput.style.left = status.x + this.cvsOffsetX + 'px'
      }
      if (status.y !== undefined) {
        this.divCursor.style.top = status.y + 'px'
        this.textInput.style.top = status.y + 'px'
      }
      if (status.height !== undefined) {
        this.divCursor.style.height = status.height + 'px'
        this.textInput.style.height = status.height + 'px'
      }
      window.clearInterval(blinkTimer)
      if (status.visible === true) {
        blinkTimer = window.setInterval(() => {
          setCursorVisibility(!cursorVisible)
        }, 540)
      }
      if (status.visible !== undefined) {
        setCursorVisibility(status.visible)
      }
    }
  })();

  /**
   * 编辑器构造函数
   * @param container 编辑器容器 DOM 元素
   * @param config 编辑器配置数据实例
   */
  constructor(container: HTMLDivElement, config: EditorConfig) {
    this.config = { ...editorConfig, ...config }
    this.container = container
    this.initDOM()
    this.selectionController = new SelectionController(this.doc)
    this.tableController = new TableController(this, this.doc)
    this.searchController = new SearchController(this, this.doc)

    this.bindBasicEvents()
    this.bindReadEvents()
    if (this.config.canEdit) {
      this.bindEditEvents()
    }
  }

  /**
   * 通过 delta 初始化文档内容
   * @param delta change 数组
   */
  public readFromChanges(delta: Delta) {
    this.delta = delta
    this.doc.readFromChanges(delta)
    console.log('read finished', performance.now() - (window as any).start)
    this.startDrawing()
  }

  /**
   * 为选区设置格式
   * @param attr 新的格式
   * @param selection 选区
   */
  public format(attr: IFragmentOverwriteAttributes) {
    if (this.doc.selection) {
      const diff = this.doc.format(attr, this.doc.selection)
      this.pushDelta(diff)
      this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
    }
  }

  /**
   * 清除选区范围内容的格式
   * @param selection 需要清除格式的选区范围
   */
  public clearFormat(selection?: IRange) {
    const sel = selection || this.doc.selection
    if (sel) {
      const diff = this.doc.clearFormat(sel)
      this.pushDelta(diff)
    }
  }

  /**
   * 添加链接
   */
  public setLink(url: string) {
    if (this.doc.selection === null) return
    const linkStart = this.doc.selection.index
    let linkLength = this.doc.selection.length
    if (linkLength === 0) {
      // 如果没有选区就先插入一段文本
      this.insertText(url, this.doc.selection)
      linkLength = url.length
    }
    this.doc.format({ link: url }, { index: linkStart, length: linkLength })
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean) {
    const selection = this.doc.selection
    if (selection) {
      const { index, length } = selection
      const blocks: Block[] = this.doc.findBlocksByRange(index, length, EnumIntersectionType.rightFirst)
      const blockCommons = blocks.filter(block => { return block instanceof BlockCommon })
      if (blockCommons.length <= 0) { return new Delta() }
      const oldOps: Op[] = []
      const newOps: Op[] = []
      for (let i = 0; i < blockCommons.length; i++) {
        const element = blockCommons[i]
        oldOps.push(...element.toOp());
        (blockCommons[i] as BlockCommon).setIndent(increase, index, length)
        newOps.push(...element.toOp())
      }
      this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

      const diff = (new Delta(oldOps)).diff(new Delta(newOps))
      const res = new Delta()
      if (blockCommons[0].start > 0) {
        res.retain(blockCommons[0].start)
      }
      this.pushDelta(res.concat(diff))
    }
  }

  /**
   * 设置引用块
   */
  public setQuoteBlock() {
    const selection = this.doc.selection
    if (selection) {
      const { index, length } = selection
      const blocks = this.doc.findBlocksByRange(index, length)
      if (blocks.length <= 0) { return new Delta() }
      const quoteBlocks = blocks.filter((blk: Block) => blk instanceof QuoteBlock)
      let diffDelta: Delta | undefined
      if (quoteBlocks.length === blocks.length) {
        // 如果所有的 block 都是 quoteblock 就取消所有的 quoteblock
        diffDelta = this.setParagraph({ index, length })
      } else {
        const oldOps: Op[] = []
        // 如果存在不是 quoteblock 的 block，就把他设置成 quoteblock，注意这里可能还需要合并前后的 quoteblock
        let startQuoteBlock: QuoteBlock
        if (blocks[0].prevSibling instanceof QuoteBlock) {
          startQuoteBlock = blocks[0].prevSibling
          oldOps.push(...startQuoteBlock.toOp())
        } else {
          startQuoteBlock = new QuoteBlock()
          startQuoteBlock.setWidth(this.config.canvasWidth)
          this.doc.addBefore(startQuoteBlock, blocks[0])
        }
        for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
          const element = blocks[blocksIndex]
          oldOps.push(...element.toOp())
          const frames = element.getAllLayoutFrames()
          startQuoteBlock.addAll(frames)
          this.doc.remove(element)
        }
        if (startQuoteBlock.nextSibling instanceof QuoteBlock) {
          oldOps.push(...startQuoteBlock.nextSibling.toOp())
          const frames = startQuoteBlock.nextSibling.removeAll()
          startQuoteBlock.addAll(frames)
          this.doc.remove(startQuoteBlock.nextSibling)
        }
        startQuoteBlock.needLayout = true

        let startIndex = 0
        let startPositionY = 0
        if (startQuoteBlock.prevSibling) {
          startIndex = startQuoteBlock.prevSibling.start + startQuoteBlock.prevSibling.length
          startPositionY = startQuoteBlock.prevSibling.y + startQuoteBlock.prevSibling.height
        }

        startQuoteBlock.setStart(startIndex, true, true, true)
        startQuoteBlock.setPositionY(startPositionY, false, true)

        this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

        const diff = (new Delta(oldOps)).diff(new Delta(startQuoteBlock.toOp()))
        const res = new Delta()
        if (startQuoteBlock.start > 0) {
          res.retain(startQuoteBlock.start)
        }
        diffDelta = res.concat(diff)
      }
      if (diffDelta) {
        this.pushDelta(diffDelta)
      }
    }
  }

  /**
   * 设置列表
   */
  public setList(listType: EnumListType) {
    const selection = this.doc.selection
    if (selection) {
      const { index, length } = selection
      const affectedListId = new Set<number>()
      const blocks = this.doc.findBlocksByRange(index, length)
      if (blocks.length <= 0) { return new Delta() }
      let startIndex = 0
      let startPositionY = 0
      if (blocks[0].prevSibling) {
        startIndex = blocks[0].prevSibling.start + blocks[0].prevSibling.length
        startPositionY = blocks[0].prevSibling.y + blocks[0].prevSibling.height
      }
      let startListItem: ListItem

      const newListId = increaseId()
      const oldOps: Op[] = []
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const block = blocks[blockIndex]
        oldOps.push(...block.toOp())
        if (block instanceof ListItem) {
          // 如果本身就是 listitem 就直接改 listType，并且统一 listId
          affectedListId.add(block.attributes.listId)
          block.format({
            listType,
            listId: newListId,
          }, 0, block.length)
          block.needLayout = true
          if (blockIndex === 0) {
            startListItem = block
          }
        } else {
          // 如果本身不是 listitem，就把他的每一个 frame 拆出来构建一个 listitem
          const frames = block.getAllLayoutFrames()
          for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
            const frame = frames[frameIndex]
            const listItemOriginAttributes: any = {}
            switch (listType) {
              case EnumListType.ol1:
                listItemOriginAttributes['list-type'] = 'decimal'
              // break omitted
              case EnumListType.ol2:
                listItemOriginAttributes['list-type'] = 'ckj-decimal'
              // break omitted
              case EnumListType.ol3:
                listItemOriginAttributes['list-type'] = 'upper-decimal'
                listItemOriginAttributes['list-id'] = newListId
                break
              case EnumListType.ul1:
                listItemOriginAttributes['list-type'] = 'decimal'
              // break omitted
              case EnumListType.ul2:
                listItemOriginAttributes['list-type'] = 'ring'
              // break omitted
              case EnumListType.ul3:
                listItemOriginAttributes['list-type'] = 'arrow'
                listItemOriginAttributes['list-id'] = newListId
                break
              default:
                listItemOriginAttributes['list-type'] = 'decimal'
                listItemOriginAttributes['list-id'] = newListId
                break
            }
            const newListItem = new ListItem()
            newListItem.setWidth(this.config.canvasWidth)
            newListItem.addAll([frame])
            newListItem.setAttributes(listItemOriginAttributes)
            this.doc.addBefore(newListItem, block)
            if (blockIndex === 0 && frameIndex === 0) {
              startListItem = newListItem
            }
          }
          this.doc.remove(block)
        }
      }

      startListItem!.setStart(startIndex, true, true, true)
      startListItem!.setPositionY(startPositionY, false, true)
      this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

      const newBlocks = this.doc.findBlocksByRange(index, length)
      const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

      const diff = (new Delta(oldOps)).diff(new Delta(newOps))
      const res = new Delta()
      if (startListItem!.start > 0) {
        res.retain(startListItem!.start)
      }
      this.pushDelta(res.concat(diff))
    }
  }

  /**
   * 设置普通段落
   */
  public setParagraph(selection: IRange | null = this.doc.selection, pushDelta = true): Delta | undefined {
    if (selection) {
      const { index, length } = selection
      const blocks = this.doc.findBlocksByRange(index, length)
      if (blocks.length <= 0) { return new Delta() }

      let startIndex = 0
      let startPositionY = 0
      if (blocks[0].prevSibling) {
        startIndex = blocks[0].prevSibling.start + blocks[0].prevSibling.length
        startPositionY = blocks[0].prevSibling.y + blocks[0].prevSibling.height
      }
      let startParagraph: Paragraph
      const oldOps: Op[] = []
      for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
        oldOps.push(...blocks[blocksIndex].toOp())
        const frames = blocks[blocksIndex].getAllLayoutFrames()
        for (let framesIndex = 0; framesIndex < frames.length; framesIndex++) {
          const frame = frames[framesIndex]
          const newParagraph = new Paragraph()
          newParagraph.setWidth(this.config.canvasWidth)
          newParagraph.add(frame)
          this.doc.addBefore(newParagraph, blocks[blocksIndex])
          if (blocksIndex === 0 && framesIndex === 0) {
            startParagraph = newParagraph
          }
        }
        this.doc.remove(blocks[blocksIndex])
      }
      startParagraph!.setStart(startIndex, true, true, true)
      startParagraph!.setPositionY(startPositionY, false, true)
      this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

      const newBlocks = this.doc.findBlocksByRange(index, length)
      const newOps: Op[] = this.doc.getBlocksOps(newBlocks)

      const diff = (new Delta(oldOps)).diff(new Delta(newOps))
      const res = new Delta()
      if (newBlocks[0].start > 0) {
        res.retain(newBlocks[0].start)
      }
      const resDelta = res.concat(diff)
      if (pushDelta) {
        this.pushDelta(resDelta)
      }
      return resDelta
    }
  }

  /**
   * 插入操作
   * @param content 要插入的内容
   * @param composing 是否是输入法输入状态，输入法输入状态下不需要生成 delta
   */
  public insertText(content: string, selection: IRange, attr?: Partial<IFragmentTextAttributes>, composing = false): Delta {
    let res = new Delta()
    // 如果当前有选区就先把选择的内容删掉再插入新内容
    if (selection.length > 0) {
      const deleteOps = this.delete(selection)
      if (!composing) {
        res.concat(deleteOps)
      }
    }
    content = replace(content, /\r/g, '') // 先把回车处理掉，去掉所有的 \r,只保留 \n
    const insertBat = content.split('\n')

    let { index } = selection

    // 开始插入逻辑之前，先把受影响的 block 的 delta 记录下来
    let startIndex = index
    let insertStartDelta: Delta | undefined
    if (!composing) {
      const oldBlocks = this.doc.findBlocksByRange(selection.index, 0)
      const targetBlock = oldBlocks.length === 1 ? oldBlocks[0] : oldBlocks[1]
      startIndex = targetBlock.start
      insertStartDelta = new Delta(targetBlock.toOp())
    }

    for (let batIndex = 0; batIndex < insertBat.length; batIndex++) {
      const batContent = insertBat[batIndex]
      const blocks = this.doc.findBlocksByRange(index, 0)

      // 因为这里 blocks.length 只能是 1 或 2
      // 如果是 1 说明就是在这个 block 里面插入或者是在文档的第一个 block 开头插入，
      // 如果是 2，则肯定是在后面一个 block 的最前面插入内容
      const blocksLength = blocks.length
      if (blocksLength <= 0) {
        console.error('the blocks.length should not be 0')
        continue
      }

      const targetBlock = blocks[blocksLength - 1]

      if (batContent.length > 0) {
        const hasDiffFormat = this.doc.currentFormat !== this.doc.nextFormat
        targetBlock.insertText(batContent, index - targetBlock.start, hasDiffFormat, attr, composing)
        index += batContent.length
      }

      // 插入一个换行符
      if (batIndex < insertBat.length - 1) {
        this.doc.insertEnter(index, blocks)
        index++
      }

      if (targetBlock.nextSibling) {
        targetBlock.nextSibling.setStart(targetBlock.start + targetBlock.length, true)
      }
    }

    // 这里要先触发 change 事件，然后在设置新的 selection
    // 因为触发 change 之后才能计算文档的新结构和长度，在这之前设置 selection 可能会导致错误
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    // 插入逻辑完成后，将受影响的 block 的新的 delta 记录下来和之前的 delta 进行 diff
    if (!composing && insertStartDelta) {
      const newBlocks = this.doc.findBlocksByRange(startIndex, content.length + insertStartDelta.length())
      const endOps: Op[] = this.doc.getBlocksOps(newBlocks)
      const insertEndDelta = new Delta(endOps)
      const change = insertStartDelta.diff(insertEndDelta).ops
      if (newBlocks[0].start > 0) {
        change.unshift({ retain: newBlocks[0].start })
      }
      res = res.compose(new Delta(change))
    }
    return res
  }

  /**
   * 删除操作，删除选区范围的内容并将选区长度置为 0
   * @param forward true: 向前删除，相当于退格键； false：向后删除，相当于 win 上的 del 键
   */
  public delete(selection: IRange, forward: boolean = true): Delta {
    const oldOps: Op[] = []

    let { index, length } = selection

    const affectedListId: Set<number> = new Set()
    let resetStart: Block | null = null // 删除完成后从哪个元素开始计算 start 和 positionY

    if (length === 0 && forward) {
      // 进入这个分支表示选取长度为 0，而且是向前删除（backspace 键）
      // 这种删除情况比较复杂，先考虑一些特殊情况，如果不属于特殊情况，再走普通删除流程

      const targetBlocks = this.doc.findBlocksByRange(index, 0)

      const mergeStart = targetBlocks[0].prevSibling ?? targetBlocks[0]
      const mergeEnd = targetBlocks[targetBlocks.length - 1].nextSibling ?? targetBlocks[targetBlocks.length - 1]
      // 如果当前 block 是 ListItem，就把当前 ListItem 中每个 frame 转为 paragraph
      // 如果当前 block 是其他除 paragraph 以外的 block，就把当前 block 的第一个 frame 转为 paragraph
      const targetBlock = targetBlocks[targetBlocks.length - 1]
      if (targetBlock && index - targetBlock.start === 0 && !(targetBlock instanceof Paragraph)) {
        oldOps.push(...targetBlock.toOp())
        const endPos = targetBlock.nextSibling

        let frames: LayoutFrame[] = []
        let posBlock: Block | null = null
        if (targetBlock instanceof ListItem) {
          affectedListId.add(targetBlock.attributes.listId)
          frames = targetBlock.children
          posBlock = targetBlock.nextSibling
          resetStart = targetBlock.prevSibling
          this.doc.remove(targetBlock)
        } else if (targetBlock instanceof QuoteBlock) {
          frames = [targetBlock.children[0]]
          if (targetBlock.children.length === 1) {
            posBlock = targetBlock.nextSibling
            resetStart = targetBlock.prevSibling
            this.doc.remove(targetBlock)
          } else {
            targetBlock.remove(targetBlock.children[0])
            posBlock = targetBlock
            resetStart = targetBlock.prevSibling
          }
        }

        const paragraphs = frames.map((frame) => {
          const newParagraph = new Paragraph()
          newParagraph.setWidth(this.config.canvasWidth)
          newParagraph.add(frame)
          return newParagraph
        })

        if (posBlock !== null) {
          paragraphs.forEach((para) => { this.doc.addBefore(para, posBlock!) })
        } else {
          this.doc.addAll(paragraphs)
        }

        this.doc.tryMerge(mergeStart, mergeEnd)

        let curBlock: Block = resetStart ? resetStart.nextSibling! : this.doc.head!

        resetStart = resetStart || this.doc.head!
        resetStart.setPositionY(resetStart.y, true, true)
        resetStart.setStart(resetStart.start, true, true)

        this.doc.markListItemToLayout(affectedListId)
        this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

        const newOps: Op[] = []
        while (curBlock !== endPos) {
          newOps.push(...curBlock.toOp())
          curBlock = curBlock.nextSibling!
        }

        const diff = (new Delta(oldOps)).diff(new Delta(newOps))
        const res = new Delta().retain(paragraphs[0].start).concat(diff)
        return res
      }
    }

    if (forward && length === 0) {
      index--
      length++
    }
    const blocks = this.doc.findBlocksByRange(index, length)
    if (blocks.length <= 0) { return new Delta() }

    const mergeStart = blocks[0].prevSibling ?? blocks[0]
    let mergeEnd = blocks[blocks.length - 1].nextSibling ?? blocks[blocks.length - 1]

    blocks.forEach(block => {
      oldOps.push(...block.toOp())
    })
    // 如果 blocks 后面还有 block，要把后面紧接着的一个 block 也加进来，因为如果删除了当前 block 的换行符，后面那个 block 会被吃进来
    let lastBlock = blocks[blocks.length - 1]
    if (blocks[blocks.length - 1].nextSibling !== null) {
      lastBlock = blocks[blocks.length - 1].nextSibling!
      oldOps.push(...lastBlock.toOp())
    }

    const newDeltaRange = { index: blocks[0].start, length: lastBlock.start + lastBlock.length - length - blocks[0].start }

    let blockMerge = blocks.length > 0 &&
      blocks[0].start < index &&
      index + length >= blocks[0].start + blocks[0].length

    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      if (index <= element.start && index + length >= element.start + element.length) {
        if (blockIndex === 0) {
          resetStart = element.prevSibling || element.nextSibling!
        }
        this.doc.remove(element)
        length -= element.length
        if (element instanceof ListItem) {
          affectedListId.add(element.attributes.listId)
        }
      } else {
        const offsetStart = Math.max(index - element.start, 0)
        const minusLength = Math.min(element.start + element.length, index + length) - element.start - offsetStart
        element.delete(offsetStart, minusLength)
        length -= minusLength
        if (blockIndex === 0) {
          resetStart = element
        }
      }
    }

    // 删除了相应对象之后还要做合并操作，用靠前的 block 吃掉后面的 block
    blockMerge = blockMerge && blocks[0].isHungry()
    if (blockMerge && blocks[0].nextSibling !== null) {
      const needRemove = blocks[0].eat(blocks[0].nextSibling)
      if (needRemove) {
        if (blocks[0].nextSibling instanceof ListItem) {
          affectedListId.add(blocks[0].nextSibling.attributes.listId)
        }
        mergeEnd = blocks[0].nextSibling.nextSibling ?? blocks[0]
        this.doc.remove(blocks[0].nextSibling)
      }
    }

    this.doc.tryMerge(mergeStart, mergeEnd)

    resetStart!.setPositionY(resetStart!.y, true, true)
    resetStart!.setStart(resetStart!.start, true, true)

    // 对于受影响的列表的列表项全部重新排版
    this.doc.markListItemToLayout(affectedListId)

    // 触发 change
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const newBlocks = this.doc.findBlocksByRange(newDeltaRange.index, newDeltaRange.length)
    const newOps: Op[] = this.doc.getBlocksOps(newBlocks)
    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta().retain(newBlocks[0].start).concat(diff)
    return res
  }

  /**
   * 在指定位置用输入法开始插入内容
   * @param selection 要开始输入法输入的选区范围
   * @param attr 输入的格式
   */
  public startComposition(selection: IRange, attr: Partial<IFragmentTextAttributes>): Delta {
    let res: Delta | undefined
    this.compositionStartIndex = selection.index
    if (selection.length > 0) {
      res = this.delete(selection)
    }

    const blocks = this.doc.findBlocksByRange(selection.index, 0)
    const targetBlock = blocks.length === 1 ? blocks[0] : blocks[1]
    this.compositionStartOps = targetBlock.toOp()
    this.compositionStartRangeStart = targetBlock.start

    this.doc.format({ ...attr, composing: true }, { index: selection.index, length: 0 })
    return res || new Delta()
  }

  /**
   * 更新输入法输入的内容
   * @param content 输入法中最新的输入内容
   * @param attr 输入的格式
   */
  public updateComposition(content: string, attr: Partial<IFragmentTextAttributes>) {
    const _selection = this.doc.getSelection()
    if (_selection) {
      this.insertText(content, { index: _selection.index, length: 0 }, attr, true)
      this.doc.setSelection({
        index: this.compositionStartIndex + content.length,
        length: 0,
      }, false)
    } else {
      console.error('this._selection should not be empty when update composition')
    }
  }

  /**
   * 结束输入法输入
   * @param length 输入法输入内容的长度
   */
  public endComposition(length: number): Delta {
    this.doc.format({ composing: false }, { index: this.compositionStartIndex, length })

    const startDelta = new Delta(this.compositionStartOps)
    const blocks = this.doc.findBlocksByRange(this.compositionStartRangeStart, length + startDelta.length())
    const endOps: Op[] = this.doc.getBlocksOps(blocks)
    const endDelta = new Delta(endOps)
    const diff = startDelta.diff(endDelta)
    const res = new Delta()
    if (blocks[0].start > 0) {
      res.retain(blocks[0].start)
    }
    this.compositionStartOps = []
    return res.concat(diff)
  }

  /**
   * 清除文档内容
   */
  public clearData() {
    // TODO
  }

  /**
   * 滚动可视区域到指定位置
   */
  public scrollTo(posY: number) {
    this.heightPlaceholderContainer.scrollTop = posY
  }

  /**
   * 搜索指定字符串
   */
  public search(keywords: string) {
    const res = this.searchController.search(keywords)
    if (res.length > 0) {
      const targetResult = res[0]
      this.scrollToViewPort(targetResult.rects[0].y)
    }
  }

  /**
   * 清除搜索
   */
  public clearSearch() {
    this.searchController.clearSearch()
  }

  /**
   * 选中下一个搜索结果
   */
  public nextSearchResult() {
    const nextRes = this.searchController.nextSearchResult()
    if (nextRes !== null) {
      this.scrollToViewPort(nextRes.res.rects[0].y)
    }
  }

  /**
   * 选中上一个搜索结果
   */
  public prevSearchResult() {
    const prevRes = this.searchController.nextSearchResult()
    if (prevRes !== null) {
      this.scrollToViewPort(prevRes.res.rects[0].y)
    }
  }

  /**
   * 替换
   */
  public replace(replaceWords: string, all = false) {
    const diff = this.doc.replace(replaceWords, all)
    this.pushDelta(diff)
  }

  /**
   * undo
   */
  public undo() {
    const undoDelta = this.history.undo()
    if (undoDelta) {
      this.doc.applyChanges(undoDelta)
      this.delta = this.delta.compose(undoDelta)
    }
  }

  /**
   * redo
   */
  public redo() {
    const redoDelta = this.history.redo()
    if (redoDelta) {
      this.doc.applyChanges(redoDelta)
      this.delta = this.delta.compose(redoDelta)
    }
  }

  /**
   * 把指定的绝对坐标滚动到可视区域
   */
  private scrollToViewPort(posY: number) {
    if (posY > this.scrollTop + this.config.containerHeight || posY < this.scrollTop) {
      const targetScrollTop = Math.floor(posY - this.config.containerHeight / 2)
      this.scrollTo(targetScrollTop)
    }
  }

  private bindBasicEvents() {
    document.addEventListener('mousemove', this.onMouseMove, true)
    document.addEventListener('mousedown', this.onMouseDown, true)
    document.addEventListener('mouseup', this.onMouseUp, true)
    document.addEventListener('click', this.onClick, true)
    this.heightPlaceholderContainer.addEventListener('scroll', this.onEditorScroll)
  }

  /**
   * 绑定阅读文档所需的相关事件
   */
  private bindReadEvents() {
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_SIZE, this.setEditorHeight)
    this.em.addListener(EventName.DOCUMENT_CHANGE_CONTENT, this.onDocumentContentChange)
    this.doc.em.addListener(EventName.DOCUMENT_CHANGE_FORMAT, this.onDocumentFormatChange)

    this.doc.em.addListener(EventName.DOCUMENT_NEED_DRAW, this.onDocumentNeedDraw)

    this.doc.em.addListener('OPEN_LINK', this.openLink)

    this.selectionController.em.addListener(EventName.CHANGE_SELECTION, this.onSelectionChange)
  }

  /**
   * 绑定编辑文档所需的相关事件
   */
  private bindEditEvents() {
    this.history.em.addListener(EventName.HISTORY_STACK_CHANGE, (status) => {
      this.em.emit(EventName.EDITOR_CHANGE_HISTORY_STACK, status)
    })
    this.textInput.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace') {
        this.onBackSpace()
      } else if (event.keyCode === 37) {
        if (!this.composing && this.doc.selection) {
          const { index, length } = this.doc.selection
          let newIndex = length > 0 ? index : index - 1
          newIndex = Math.max(0, newIndex)
          this.doc.setSelection({ index: newIndex, length: 0 })
        }
      } else if (event.keyCode === 39) {
        if (!this.composing && this.doc.selection) {
          const { index, length } = this.doc.selection
          let newIndex = length > 0 ? index + length : index + 1
          newIndex = Math.min(this.doc.length - 1, newIndex)
          this.doc.setSelection({ index: newIndex, length: 0 })
        }
      } else if (event.keyCode === 38) {
        // const newX = this.doc.selectionRectangles[this.doc.selectionRectangles.length - 1].x
        // const newY = this.doc.selectionRectangles[this.doc.selectionRectangles.length - 1].y - 1
        // const docPos = this.doc.getDocumentPos(newX, newY)
        // TODO
        // this.doc.setSelection({ index: docPos, length: 0 }, true)
      } else if (event.keyCode === 40) {
        // const targetRect = this.doc.selectionRectangles[0]
        // const newX = targetRect.x
        // const newY = targetRect.y + targetRect.height + 1
        // const docPos = this.doc.getDocumentPos(newX, newY)
        // TODO
        // this.doc.setSelection({ index: docPos, length: 0 }, true)
      }
    })
    this.textInput.addEventListener('input', () => {
      if (!this.composing) {
        this.onInput(this.textInput.value)
        this.textInput.value = ''
      }
    })
    this.textInput.addEventListener('compositionstart', () => {
      this.composing = true
      this.em.emit(EventName.EDITOR_COMPOSITION_START)
      if (this.doc.selection && this.doc.nextFormat) {
        const diff = this.startComposition(this.doc.selection, convertFormatFromSets(this.doc.nextFormat))
        this.pushDelta(diff)
      }
    })
    this.textInput.addEventListener('compositionupdate', (event: Event) => {
      this.em.emit(EventName.EDITOR_COMPOSITION_UPDATE)
      if (this.doc.nextFormat) {
        this.updateComposition((event as CompositionEvent).data, convertFormatFromSets(this.doc.nextFormat))
      }
    })
    this.textInput.addEventListener('compositionend', () => {
      this.em.emit(EventName.EDITOR_COMPOSITION_END)
      this.composing = false
      if (this.doc.nextFormat) {
        const diff = this.endComposition(this.textInput.value.length)
        this.pushDelta(diff)
      }
      this.textInput.value = ''
    })
  }

  /**
   * 初始化编辑器 DOM 结构
   */
  private initDOM() {
    this.cvsOffsetX = ((this.config.containerWidth - this.config.canvasWidth) / 2)
    this.container.style.width = this.config.containerWidth + 'px'
    this.container.style.height = this.config.containerHeight + 'px'

    this.cvsDoc.id = 'cvsDoc'
    this.cvsDoc.style.width = this.config.canvasWidth + 'px'
    this.cvsDoc.style.height = this.config.containerHeight + 'px'
    this.cvsDoc.style.left = this.cvsOffsetX + 'px'

    const ratio = getPixelRatio(this.ctx)
    this.cvsDoc.width = this.config.canvasWidth * ratio
    this.cvsDoc.height = this.config.containerHeight * ratio
    if (ratio !== 1) { this.ctx.scale(ratio, ratio) }

    this.heightPlaceholderContainer.id = 'heightPlaceholderContainer'
    this.heightPlaceholder.id = 'divHeightPlaceholder'

    this.divCursor = document.createElement('div')
    this.divCursor.id = 'divCursor'
    this.divCursor.tabIndex = -1

    this.textInput = document.createElement('textarea')
    this.textInput.id = 'textInput'
    this.textInput.tabIndex = -1
    this.textInput.autocomplete = 'off'
    this.textInput.autocapitalize = 'none'
    this.textInput.spellcheck = false

    this.heightPlaceholderContainer.appendChild(this.heightPlaceholder)
    this.heightPlaceholderContainer.appendChild(this.textInput)
    this.heightPlaceholderContainer.appendChild(this.divCursor)
    this.container.appendChild(this.cvsDoc)
    this.container.appendChild(this.heightPlaceholderContainer)
  }

  /**
   * 绘制文档内容
   */
  private render = () => {
    if (this.needRender === RenderType.FastRender) {
      this.doc.fastDraw(this.ctx, this.scrollTop, this.config.containerHeight)
    } else if (this.needRender === RenderType.Render) {
      this.doc.draw(this.ctx, this.scrollTop, this.config.containerHeight)
    }
    this.selectionController.draw(this.ctx, this.scrollTop, this.config.containerHeight)
    this.needRender = RenderType.NoRender
  }

  /**
   * 开始绘制任务
   * @param {boolean} fast 是否为快速绘制
   */
  public startDrawing(fast = false) {
    if (this.needRender === RenderType.NoRender) {
      requestAnimationFrame(this.render)
      this.needRender = RenderType.FastRender
    }
    if (!fast) {
      this.needRender = RenderType.Render
    }
  }

  private onEditorScroll = () => {
    this.scrollTop = this.heightPlaceholderContainer.scrollTop
    this.startDrawing(true)
  }

  private onMouseDown = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    const docRect = {
      x: 0,
      y: 0,
      width: this.config.canvasWidth,
      height: this.config.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      this.selectionController.startSelection(x, y)
      this.changeCursorStatus({
        visible: false,
      })
    }
    this.doc.onPointerDown(x, y)
  }

  private onMouseMove = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    const childrenStack = this.doc.getChildrenStackByPos(x, y)
    // 设置鼠标指针样式
    this.heightPlaceholderContainer.style.cursor = childrenStack[childrenStack.length - 1].getCursorType()
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    this.selectionController.updateSelection(x, y)
    const docRect = {
      x: 0,
      y: 0,
      width: this.config.canvasWidth,
      height: this.config.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      if (!this.isPointerHoverDoc) {
        this.doc.onPointerEnter(x, y, childrenStack, 0)
        this.isPointerHoverDoc = true
      }
      this.doc.onPointerMove(x, y, childrenStack, 0)
    } else {
      if (this.isPointerHoverDoc) {
        this.doc.onPointerLeave()
        this.isPointerHoverDoc = false
      }
    }
  }

  private onMouseUp = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    this.selectionController.endSelection(x, y)

    this.doc.onPointerUp(x, y)
    const selection = this.selectionController.getSelection()
    if (selection.length === 1 && compareDocPos(selection[0].start, selection[0].end) === 0) {
      const rects = this.selectionController.getSelectionRectangles(selection)
      if (rects.length > 0) {
        this.changeCursorStatus({
          visible: true,
          x: rects[0].x,
          y: rects[0].y,
          height: rects[0].height,
        })
      }
    } else if (selection.length > 0) {
      const scrollPos = this.heightPlaceholderContainer.scrollTop
      const rects = this.selectionController.getSelectionRectangles([{ start: selection[0].start, end: selection[0].start }])
      if (rects.length > 0) {
        this.changeCursorStatus({
          visible: false,
          x: rects[0].x,
          y: rects[0].y,
          height: rects[0].height,
        })
      }
      this.textInput.focus()
      this.scrollTo(scrollPos)
    }
  }

  private onClick = (event: MouseEvent) => {
    const { x, y } = this.calOffsetDocPos(event.pageX, event.pageY)
    this.currentPointerScreenX = event.screenX
    this.currentPointerScreenY = event.screenY
    const docRect = {
      x: 0,
      y: 0,
      width: this.config.canvasWidth,
      height: this.config.containerHeight,
    }
    if (isPointInRectangle(x, y - this.scrollTop, docRect)) {
      this.doc.onPointerTap(x, y)
    }
  }

  private calOffsetDocPos = (pageX: number, pageY: number): { x: number, y: number } => {
    return {
      x: pageX - this.container.offsetLeft - this.cvsOffsetX,
      y: pageY - this.container.offsetTop + this.scrollTop,
    }
  }

  private onSelectionChange = () => {
    this.startDrawing(true)
  }

  private onDocumentContentChange = () => {
    this.startDrawing()
  }

  private onDocumentNeedDraw = () => {
    this.startDrawing(true)
  }

  private onBackSpace = () => {
    if (this.doc.selection) {
      const diff = this.delete(this.doc.selection)
      this.pushDelta(diff)
      this.doc.setSelection({
        index: this.doc.selection.length > 0 ? this.doc.selection.index : this.doc.selection.index - 1,
        length: 0,
      }, false)
    }
  }

  private onInput = (content: string) => {
    if (this.doc.selection && this.doc.nextFormat) {
      const diff = this.insertText(content, this.doc.selection, convertFormatFromSets(this.doc.nextFormat))
      this.pushDelta(diff)
      this.doc.setSelection({
        index: this.doc.selection.index + content.length,
        length: 0,
      }, false)
    }
  }

  private pushDelta(diff: Delta) {
    if (diff.ops.length > 0 && this.delta) {
      this.history.push({
        redo: diff,
        undo: diff.invert(this.delta),
      })
      this.delta = this.delta.compose(diff)
    }
  }

  private openLink = (link: string) => {
    window.open(link)
  }
}
