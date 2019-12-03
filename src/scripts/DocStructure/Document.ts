import * as EventEmitter from 'eventemitter3'
import replace from 'lodash/replace'
import Delta from 'quill-delta'
import Op from 'quill-delta/dist/Op'
import { EventName } from '../Common/EnumEventName'
import ICanvasContext from '../Common/ICanvasContext'
import IRange from '../Common/IRange'
import IRectangle from '../Common/IRectangle'
import { ISearchResult } from '../Common/ISearchResult'
import { LinkedList } from '../Common/LinkedList'
import { requestIdleCallback } from '../Common/Platform'
import { collectAttributes, EnumIntersectionType, findChildrenByRange, hasIntersection, increaseId, splitIntoBat } from '../Common/util'
import editorConfig from '../IEditorConfig'
import Block from './Block'
import { EnumListType } from './EnumListStyle'
import Fragment from './Fragment'
import FragmentDate from './FragmentDate'
import FragmentImage from './FragmentImage'
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import FragmentParaEnd from './FragmentParaEnd'
import FragmentText from './FragmentText'
import IFragmentTextAttributes from './FragmentTextAttributes'
import LayoutFrame from './LayoutFrame'
import ListItem from './ListItem'
import Paragraph from './Paragraph'
import QuoteBlock from './QuoteBlock'
import ILayoutFrameAttributes from './LayoutFrameAttributes'
// import Attachment from './Attachment';
// import CodeBlock from './CodeBlock';
// import Divide from './Divide';
// import Location from './Location';
// import Table from './Table';

/**
 * block 类型枚举
 */
export enum EnumBlockType {
  Paragraph = 'Paragraph',
  QuoteBlock = 'QuoteBlock',
  CodeBlock = 'CodeBlock',
  Divide = 'Divide',
  ListItem = 'ListItem',
  Location = 'Location',
  Attachment = 'Attachment',
  Table = 'Table',
}
export default class Document extends LinkedList<Block> {
  public get selection(): IRange | null {
    return this._selection
  }
  public em: EventEmitter = new EventEmitter();
  public width: number = 0;
  public height: number = 0;
  public length: number = 0;
  public readonly children: Block[] = [];
  public selectionRectangles: IRectangle[] = [];
  // 选区变更时同时修改这个值和 nextFormat
  public currentFormat: { [key: string]: Set<any> } | null = null;
  // 选区长度为 0 时用工具栏改格式只改这个值，选区长度大于 0 时用工具栏改格式同时修改这个值和 currentFormat
  public nextFormat: { [key: string]: Set<any> } | null = null;

  private firstScreenRender = 0;
  private initLayout = false;
  private idleLayoutStartBlock: Block | null = null;
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private _selection: IRange | null = null;

  private compositionStartIndex: number = 0;
  private compositionStartOps: Op[] = [];
  private compositionStartRangeStart: number = 0;

  private needRecalculateSelectionRect: boolean = false;

  private searchKeywords: string = '';
  private searchResults: ISearchResult[] = [];
  private searchResultCurrentIndex: number | undefined = undefined;

  public readFromChanges = (delta: Delta) => {
    this.firstScreenRender = 0
    this.clear()
    const blocks = this.readDeltaToBlocks(delta)
    this.addAll(blocks)

    if (this.head !== null) {
      this.head.setStart(0, true, true)
    }
  }

  public applyChanges = (delta: Delta) => {
    let currentIndex = 0

    for (let index = 0; index < delta.ops.length; index++) {
      const op = delta.ops[index]
      const currentBatIndex = currentIndex
      if (op.retain !== undefined) {
        if (op.attributes !== undefined && Object.keys(op.attributes).length > 0) {
          // 如果有设置 attributes 就执行相关操作
          // 大体的思路是先把相关 block 全找出来生成 delta，然后把 当前的 op compose 上去，然后用新的 delta 重新生成 block 替换老的 block
          const oldBlocks = this.findBlocksByRange(currentBatIndex, op.retain)
          const willTreatOps: Op[] = [op]
          currentIndex += op.retain
          // 接下来找出这个 oldBlocks 范围内所有 retain 的 op，这些 op 都要在这批处理完
          while (index + 1 < delta.ops.length) {
            const nextOp = delta.ops[index + 1]
            if (nextOp.retain !== undefined) {
              if (currentIndex >= oldBlocks[oldBlocks.length - 1].start + oldBlocks[oldBlocks.length - 1].length) {
                break
              }
              currentIndex += nextOp.retain
              index++
              willTreatOps.push(nextOp)
            } else {
              break
            }
          }

          const oldOps: Op[] = []
          if (oldBlocks[0].start > 0) {
            oldOps.push({ retain: oldBlocks[0].start })
          }
          oldBlocks.forEach(block => {
            oldOps.push(...block.toOp())
          })
          const oldDelta = new Delta(oldOps)
          const newDeltaOps: Op[] = [...willTreatOps]
          if (currentBatIndex > 0) {
            newDeltaOps.unshift({ retain: currentBatIndex })
          }
          const newDelta = oldDelta.compose(new Delta(newDeltaOps))
          // 先把 newDelta 开头的 retain 都去掉，然后生成新的 block
          while (newDelta.ops[0].retain !== undefined && newDelta.ops[0].attributes === undefined) {
            newDelta.ops.shift()
          }
          const newBlocks = this.readDeltaToBlocks(newDelta)
          const oldBlocksStartIndex = this.findIndex(oldBlocks[0])
          this.splice(oldBlocksStartIndex, oldBlocks.length, newBlocks)
          const prevSibling = newBlocks[0].prevSibling
          if (prevSibling) {
            newBlocks[0].setPositionY(prevSibling.y + prevSibling.height, false, false)
          }
          this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
        } else {
          currentIndex += op.retain
        }
      } else if (op.delete !== undefined) {
        this.delete({ index: currentIndex, length: op.delete })
        if (this.selection) {
          // 如果当前有选区或光标，就要重新计算选区或光标的位置
          // 大概有 6 种情况，简化一下分别计算 index 是否需要移动以及 length 是否需要修改
          const indexOffset = Math.max(0, Math.min(this.selection.index - currentIndex, op.delete))
          const newIndex = this.selection.index - indexOffset
          let newLength = 0
          if (this.selection.length > 0) {
            const lengthOffset = Math.min(this.selection.index + this.selection.length, currentIndex + op.delete) -
              Math.max(this.selection.index, currentIndex)
            newLength = this.selection.length - Math.max(0, lengthOffset)
          }
          this.setSelection({
            index: newIndex,
            length: newLength,
          }, false)
        }
      } else if (op.insert !== undefined) {
        if (typeof op.insert === 'string') {
          if (op.insert.indexOf('\n') < 0) {
            this.insertText(op.insert, { index: currentIndex, length: 0 }, op.attributes)
          } else {
            // 如果有换行符就得重新构建相关的 block 了，重新构建相关 block 的逻辑和上面 retain 操作里面的逻辑类似
            const oldBlocks = this.findBlocksByRange(currentBatIndex, 0)
            const oldOps: Op[] = []
            if (oldBlocks[0].start > 0) {
              oldOps.push({ retain: oldBlocks[0].start })
            }
            oldBlocks.forEach(block => {
              oldOps.push(...block.toOp())
            })
            const oldDelta = new Delta(oldOps)
            const newDeltaOps: Op[] = []
            if (currentBatIndex > 0) {
              newDeltaOps.push({ retain: currentBatIndex })
            }
            newDeltaOps.push(op)
            const newDelta = oldDelta.compose(new Delta(newDeltaOps))
            // 先把 newDelta 开头的 retain 都去掉，然后生成新的 block
            while (newDelta.ops[0].retain !== undefined && newDelta.ops[0].attributes === undefined) {
              newDelta.ops.shift()
            }
            const newBlocks = this.readDeltaToBlocks(newDelta)
            const oldBlocksStartIndex = this.findIndex(oldBlocks[0])
            this.splice(oldBlocksStartIndex, oldBlocks.length, newBlocks)
            const prevSibling = newBlocks[0].prevSibling
            if (prevSibling) {
              newBlocks[0].setPositionY(prevSibling.y + prevSibling.height, false, false)
            }
          }
          // 如果当前有选区或光标，就要重新计算选区或光标的位置
          if (this.selection) {
            if (currentIndex <= this.selection.index) {
              this.setSelection({
                index: this.selection.index + op.insert.length,
                length: this.selection.length,
              }, false)
            } else if (currentIndex < this.selection.index + this.selection.length) {
              this.setSelection({
                index: this.selection.index,
                length: this.selection.length + op.insert.length,
              }, false)
            }
          }
          currentIndex += op.insert.length
        } else {
          // not implement
        }
        this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
      } else {
        console.warn('unknown op type')
      }
    }
  }

  /**
   * 清除当前文档中的所有数据
   */
  public clear() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].destroy()
    }
    this.removeAll()
  }

  /**
   * 绘制当前文档
   * @param ctx canvas context
   * @param scrollTop 文档滚动位置
   * @param viewHeight 可视区域高度
   */
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
        this.needRecalculateSelectionRect = this.needRecalculateSelectionRect ||
          (
            this.selection !== null &&
            current.needLayout &&
            hasIntersection(
              this.selection.index,
              this.selection.index + this.selection.length,
              current.start,
              current.start + current.length,
            )
          )
        current.layout()
        if (current.y + current.height >= scrollTop) {
          current.draw(ctx, scrollTop, viewHeight)
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

    // 如果内容布局发生过变化，则选区也需要重新计算
    if (this.needRecalculateSelectionRect) {
      this.calSelectionRectangles()
      this.needRecalculateSelectionRect = false
    }
    // 绘制选区
    if (this.selectionRectangles.length > 0) {
      const startIndex = this.findSelectionArea(this.selectionRectangles, scrollTop)
      ctx.drawSelectionArea(this.selectionRectangles, scrollTop, scrollTop + viewHeight, startIndex)
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
   * 获取文档内容长度
   */
  public getLength(): number {
    return this.children.reduce((sum, currentBlock: Block) => {
      return sum + currentBlock.length
    }, 0)
  }

  /**
   * 销毁当前文档
   */
  public destroy(): void {
    // TODO
    console.log('todo destroy document')
  }

  /**
   * 给文档设置新的尺寸信息
   * @param size 新尺寸信息
   */
  public setSize(size: { height?: number, width?: number }) {
    let changed = false
    if (size.height) {
      this.height = size.height
      changed = true
    }
    if (size.width) {
      this.width = size.width
      changed = true
    }
    if (changed) {
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height })
    }
  }

  public getDocumentPos = (x: number, y: number): number => {
    let targetChild
    if (y < 0) {
      targetChild = this.head
    } else if (y > this.height) {
      targetChild = this.tail
    } else {
      targetChild = this.findChildrenInPos(x, y)
    }
    if (targetChild === null) { return -1 }
    return targetChild.getDocumentPos(x, y) + targetChild.start
  }

  /**
   * 设置文档选区
   * @param index 位置索引
   * @param length 选区长度
   * @param reCalRectangle 是否立刻重新计算选区矩形
   */
  public setSelection(range: IRange | null, reCalRectangle = true) {
    if (this._selection !== range) {
      if (range === null || this._selection === null) {
        this._selection = range
      } else if (this._selection.index !== range.index || this._selection.length !== range.length) {
        this._selection = {
          index: range.index,
          length: range.length,
        }
      } else {
        // 如果新的 range 的 index 和 length 和之前的一样，就 do nothing
        return
      }
      // 如果在修改选择范围前刚刚更新过文档内容，则这里不需要立刻重新计算选区矩形，要把 reCalRectangle 置为 false
      // 因为这时文档还没有经过排版，计算此时计算矩形没有意义，draw 方法里面会判断要不要计算新的矩形范围
      // 而鼠标键盘操作导致的选择范围变更则要立刻重新计算新的矩形范围
      if (reCalRectangle) {
        this.calSelectionRectangles()
      }
      this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION, this._selection)
      this.updateCurrentFormat()
    }
  }

  /**
   * 将当前文档输出为 delta
   */
  public toDelta(): Delta {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      res.push(...element.toOp())
    }
    return new Delta(res)
  }

  /**
   * 将当前文档输出为 HTML
   */
  public toHtml(): string {
    return this.children.map((block) => block.toHtml()).join('')
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
      const oldBlocks = this.findBlocksByRange(selection.index, 0)
      const targetBlock = oldBlocks.length === 1 ? oldBlocks[0] : oldBlocks[1]
      startIndex = targetBlock.start
      insertStartDelta = new Delta(targetBlock.toOp())
    }

    for (let batIndex = 0; batIndex < insertBat.length; batIndex++) {
      const batContent = insertBat[batIndex]
      const blocks = this.findBlocksByRange(index, 0)

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
        const hasDiffFormat = this.currentFormat !== this.nextFormat
        targetBlock.insertText(batContent, index - targetBlock.start, hasDiffFormat, attr, composing)
        index += batContent.length
      }

      // 插入一个换行符
      if (batIndex < insertBat.length - 1) {
        this.insertEnter(index, blocks)
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
      const newBlocks = this.findBlocksByRange(startIndex, content.length + insertStartDelta.length())
      const endOps: Op[] = this.getBlocksOps(newBlocks)
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
    let resetStart: Block | null // 删除完成后从哪个元素开始计算 start 和 positionY

    if (length === 0 && forward) {
      // 进入这个分支表示选取长度为 0，而且是向前删除（backspace 键）
      // 这种删除情况比较复杂，先考虑一些特殊情况，如果不属于特殊情况，再走普通删除流程

      const targetBlocks = this.findBlocksByRange(index, 0)

      const mergeStart = targetBlocks[0].prevSibling ?? targetBlocks[0]
      const mergeEnd = targetBlocks[targetBlocks.length - 1].nextSibling ?? targetBlocks[targetBlocks.length - 1]
      // 如果当前 block 是 ListItem，就把当前 ListItem 中每个 frame 转为 paragraph
      // 如果当前 block 是其他除 paragraph 以外的 block，就把当前 block 的第一个 frame 转为 paragraph
      const targetBlock = targetBlocks[targetBlocks.length - 1]
      if (targetBlock && index - targetBlock.start === 0 && !(targetBlock instanceof Paragraph)) {
        oldOps.push(...targetBlock.toOp())
        const endPos = targetBlock.nextSibling

        let frames: LayoutFrame[]
        let posBlock: Block | null
        if (targetBlock instanceof ListItem) {
          affectedListId.add(targetBlock.attributes.listId)
          frames = targetBlock.children
          posBlock = targetBlock.nextSibling
          resetStart = targetBlock.prevSibling
          this.remove(targetBlock)
        } else {
          frames = [targetBlock.children[0]]
          if (targetBlock.children.length === 1) {
            posBlock = targetBlock.nextSibling
            resetStart = targetBlock.prevSibling
            this.remove(targetBlock)
          } else {
            targetBlock.remove(targetBlock.children[0])
            posBlock = targetBlock
            resetStart = targetBlock.prevSibling
          }
        }

        const paragraphs = frames.map((frame) => {
          return new Paragraph([frame], editorConfig.canvasWidth)
        })

        if (posBlock !== null) {
          paragraphs.forEach((para) => { this.addBefore(para, posBlock!) })
        } else {
          this.addAll(paragraphs)
        }

        this.tryMerge(mergeStart, mergeEnd)

        let curBlock: Block = resetStart ? resetStart.nextSibling! : this.head!

        resetStart = resetStart || this.head!
        resetStart.setPositionY(resetStart.y, true, true)
        resetStart.setStart(resetStart.start, true, true)

        this.markListItemToLayout(affectedListId)
        this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

        const newOps: Op[] = []
        while (curBlock !== endPos) {
          newOps.push(...curBlock.toOp())
          curBlock = curBlock.nextSibling!
        }

        const diff = (new Delta(oldOps)).diff(new Delta(newOps))
        const res = new Delta().retain(resetStart.start).concat(diff)
        return res
      }
    }

    if (forward && length === 0) {
      index--
      length++
    }
    const blocks = this.findBlocksByRange(index, length)
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
      if (index <= element.start && index + length >= element.length) {
        if (blockIndex === 0) {
          resetStart = element.prevSibling || element.nextSibling!
        }
        this.remove(element)
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
        this.remove(blocks[0].nextSibling)
      }
    }

    this.tryMerge(mergeStart, mergeEnd)

    resetStart!.setPositionY(resetStart!.y, true, true)
    resetStart!.setStart(resetStart!.start, true, true)
    this.needRecalculateSelectionRect = true

    // 对于受影响的列表的列表项全部重新排版
    this.markListItemToLayout(affectedListId)

    // 触发 change
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const newBlocks = this.findBlocksByRange(newDeltaRange.index, newDeltaRange.length)
    const newOps: Op[] = this.getBlocksOps(newBlocks)
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

    const blocks = this.findBlocksByRange(selection.index, 0)
    const targetBlock = blocks.length === 1 ? blocks[0] : blocks[1]
    this.compositionStartOps = targetBlock.toOp()
    this.compositionStartRangeStart = targetBlock.start

    this.format({ ...attr, composing: true }, { index: selection.index, length: 0 })
    return res || new Delta()
  }

  /**
   * 更新输入法输入的内容
   * @param content 输入法中最新的输入内容
   * @param attr 输入的格式
   */
  public updateComposition(content: string, attr: Partial<IFragmentTextAttributes>) {
    if (this._selection) {
      this.insertText(content, { index: this._selection.index, length: 0 }, attr, true)
      this.setSelection({
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
    this.format({ composing: false }, { index: this.compositionStartIndex, length })

    const startDelta = new Delta(this.compositionStartOps)
    const blocks = this.findBlocksByRange(this.compositionStartRangeStart, length + startDelta.length())
    const endOps: Op[] = this.getBlocksOps(blocks)
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
   * 给指定范围设置新的文档格式
   * @param attr 新格式数据
   * @param selection 需要设置格式的范围
   */
  public format(attr: IFragmentOverwriteAttributes, selection: IRange): Delta {
    const { index, length } = selection
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst)
    if (blocks.length <= 0) { return new Delta() }
    const oldOps: Op[] = []
    const newOps: Op[] = []
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      oldOps.push(...element.toOp())
      const offsetStart = Math.max(index - element.start, 0)
      element.format(
        attr,
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      )
      newOps.push(...element.toOp())
    }

    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)
    this.updateCurrentFormat()
    // 如果长度是 0，还要尝试修改 nextFormat
    if (length === 0) {
      this.updateNextFormat(attr)
    }
    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (blocks[0].start > 0) {
      res.retain(blocks[0].start)
    }
    return res.concat(diff)
  }

  /**
   * 清除选区范围内容的格式
   * @param selection 需要清除格式的选区范围
   */
  public clearFormat(selection: IRange): Delta {
    const blocks = this.findBlocksByRange(selection.index, selection.length, EnumIntersectionType.rightFirst)
    if (blocks.length <= 0) { return new Delta() }
    const oldOps: Op[] = []
    const newOps: Op[] = []
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      oldOps.push(...element.toOp())
      const offsetStart = Math.max(selection.index - element.start, 0)
      element.clearFormat(
        offsetStart,
        Math.min(element.start + element.length, selection.index + selection.length) - element.start - offsetStart,
      )
      newOps.push(...element.toOp())
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (blocks[0].start > 0) {
      res.retain(blocks[0].start)
    }
    return res.concat(diff)
  }

  /**
   * 获取指定范围的文档内容格式信息
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const res: { [key: string]: Set<any> } = {}
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst)
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex]
      const offsetStart = Math.max(index - element.start, 0)
      collectAttributes(
        element.getFormat(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        ), res)
    }
    return res
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, index: number, length: number): Delta {
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst)
    if (blocks.length <= 0) { return new Delta() }
    const oldOps: Op[] = []
    const newOps: Op[] = []
    for (let i = 0; i < blocks.length; i++) {
      const element = blocks[i]
      oldOps.push(...element.toOp())
      blocks[i].setIndent(increase, index, length)
      newOps.push(...element.toOp())
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (blocks[0].start > 0) {
      res.retain(blocks[0].start)
    }
    return res.concat(diff)
  }

  /**
   * 在指定位置设置 quoteblock
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public setQuoteBlock(index: number, length: number): Delta {
    const blocks = this.findBlocksByRange(index, length)
    if (blocks.length <= 0) { return new Delta() }
    const quoteBlocks = blocks.filter((blk: Block) => blk instanceof QuoteBlock)
    if (quoteBlocks.length === blocks.length) {
      // 如果所有的 block 都是 quoteblock 就取消所有的 quoteblock
      return this.setParagraph(index, length)
    } else {
      const oldOps: Op[] = []
      // 如果存在不是 quoteblock 的 block，就把他设置成 quoteblock，注意这里可能还需要合并前后的 quoteblock
      let startQuoteBlock: QuoteBlock
      if (blocks[0].prevSibling instanceof QuoteBlock) {
        startQuoteBlock = blocks[0].prevSibling
        oldOps.push(...startQuoteBlock.toOp())
      } else {
        startQuoteBlock = new QuoteBlock([], editorConfig.canvasWidth)
        this.addBefore(startQuoteBlock, blocks[0])
      }
      for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
        const element = blocks[blocksIndex]
        oldOps.push(...element.toOp())
        const frames = element.removeAll()
        startQuoteBlock.addAll(frames)
        this.remove(element)
      }
      if (startQuoteBlock.nextSibling instanceof QuoteBlock) {
        oldOps.push(...startQuoteBlock.nextSibling.toOp())
        const frames = startQuoteBlock.nextSibling.removeAll()
        startQuoteBlock.addAll(frames)
        this.remove(startQuoteBlock.nextSibling)
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
      return res.concat(diff)
    }
  }

  /**
   * 在指定位置设置 list
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public setList(listType: EnumListType, index: number, length: number) {
    const affectedListId = new Set<number>()
    const blocks = this.findBlocksByRange(index, length)
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
        const frames = block.removeAll()
        for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
          const frame = frames[frameIndex]
          const listItemOriginAttributes: any = {}
          switch (listType) {
            case EnumListType.ol1:
              listItemOriginAttributes.ordered = 'decimal'
              // break omitted
            case EnumListType.ol2:
              listItemOriginAttributes.ordered = 'ckj-decimal'
              // break omitted
            case EnumListType.ol3:
              listItemOriginAttributes.ordered = 'upper-decimal'
              listItemOriginAttributes['list-id'] = newListId
              break
            case EnumListType.ul1:
              listItemOriginAttributes.bullet = 'decimal'
              // break omitted
            case EnumListType.ul2:
              listItemOriginAttributes.bullet = 'ring'
              // break omitted
            case EnumListType.ul3:
              listItemOriginAttributes.bullet = 'arrow'
              listItemOriginAttributes['bullet-id'] = newListId
              break
            default:
              listItemOriginAttributes.ordered = 'decimal'
              listItemOriginAttributes['list-id'] = newListId
              break
          }
          const newListItem = new ListItem([frame], listItemOriginAttributes, editorConfig.canvasWidth)
          this.addBefore(newListItem, block)
          if (blockIndex === 0 && frameIndex === 0) {
            startListItem = newListItem
          }
        }
        this.remove(block)
      }
    }

    startListItem!.setStart(startIndex, true, true, true)
    startListItem!.setPositionY(startPositionY, false, true)
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const newBlocks = this.findBlocksByRange(index, length)
    const newOps: Op[] = this.getBlocksOps(newBlocks)

    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (startListItem!.start > 0) {
      res.retain(startListItem!.start)
    }
    return res.concat(diff)
  }

  /**
   * 在指定位置设置 paragraph
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public setParagraph(index: number, length: number): Delta {
    const blocks = this.findBlocksByRange(index, length)
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
      const frames = blocks[blocksIndex].removeAll()
      for (let framesIndex = 0; framesIndex < frames.length; framesIndex++) {
        const frame = frames[framesIndex]
        const newParagraph = new Paragraph([frame], editorConfig.canvasWidth)
        this.addBefore(newParagraph, blocks[blocksIndex])
        if (blocksIndex === 0 && framesIndex === 0) {
          startParagraph = newParagraph
        }
      }
      this.remove(blocks[blocksIndex])
    }
    startParagraph!.setStart(startIndex, true, true, true)
    startParagraph!.setPositionY(startPositionY, false, true)
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT)

    const newBlocks = this.findBlocksByRange(index, length)
    const newOps: Op[] = this.getBlocksOps(newBlocks)

    const diff = (new Delta(oldOps)).diff(new Delta(newOps))
    const res = new Delta()
    if (newBlocks[0].start > 0) {
      res.retain(newBlocks[0].start)
    }
    return res.concat(diff)
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

  // #region override LinkedList method
  /**
   * 将一个 block 添加到当前 block
   * @param node 要添加的 block
   */
  public add(node: Block) {
    super.add(node)
    node.setMaxWidth(editorConfig.canvasWidth)
    node.start = this.length
    this.length += node.length
  }

  /**
   * 在目标 block 实例前插入一个 block
   * @param node 要插入的 block 实例
   * @param target 目标 block 实例
   */
  public addBefore(node: Block, target: Block) {
    super.addBefore(node, target)
    node.setMaxWidth(editorConfig.canvasWidth)
    const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length
    node.setStart(start, true, true)
    this.length += node.length
    if (node instanceof ListItem) {
      this.markListItemToLayout((new Set<number>()).add(node.attributes.listId))
    }
  }

  /**
   * 在目标 block 实例后插入一个 block
   * @param node 要插入的 block 实例
   * @param target 目标 block 实例
   */
  public addAfter(node: Block, target: Block) {
    super.addAfter(node, target)
    node.setMaxWidth(editorConfig.canvasWidth)
    node.setStart(target.start + target.length, true, true)
    this.length += node.length
    if (node instanceof ListItem) {
      this.markListItemToLayout((new Set<number>()).add(node.attributes.listId))
    }
  }

  /**
   * 清楚当前 doc 中所有 block
   */
  public removeAll() {
    this.length = 0
    return super.removeAll()
  }

  /**
   * 从当前 doc 删除一个 block
   * @param node 要删除的 block
   */
  public remove(node: Block) {
    if (node.nextSibling !== null) {
      const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length
      node.nextSibling.setStart(start, true, true)
    }

    super.remove(node)
    this.length -= node.length
    if (node instanceof ListItem) {
      this.markListItemToLayout((new Set<number>()).add(node.attributes.listId))
    }
  }

  public splice(start: number, deleteCount: number, nodes: Block[] = []): Block[] {
    const actuallyInsertIndex = Math.min(start, this.children.length - 1)
    const removedBlocks = super.splice(start, deleteCount, nodes)
    const elementStart = actuallyInsertIndex > 0 ? this.children[actuallyInsertIndex - 1].start + this.children[actuallyInsertIndex - 1].length : 0
    if (nodes.length > 0) {
      nodes[0].setStart(elementStart, true, true, true)
    }
    return removedBlocks
  }
  // #endregion

  /**
   * 计算选区矩形位置，文档中光标的位置也是根据这个值得来的
   * @param correctByPosY 用来修正最终计算结果的 y 坐标
   */
  public calSelectionRectangles(correctByPosY?: number) {
    this.selectionRectangles = []
    if (this._selection !== null) {
      if (typeof correctByPosY === 'number') {
        correctByPosY = Math.max(0, correctByPosY)
        correctByPosY = Math.min(this.height, correctByPosY)
      }
      const { index, length } = this._selection
      if (length === 0) {
        // 如果长度是 0，说明是光标状态
        const blocks = this.findBlocksByRange(index, length)
        this.selectionRectangles = blocks[blocks.length - 1].getSelectionRectangles(index, length, correctByPosY)
      } else {
        // 如果长度不是 0，说明是选区状态
        this.findBlocksByRange(index, length).forEach((block) => {
          this.selectionRectangles.push(...block.getSelectionRectangles(index, length, correctByPosY))
        })
      }
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION_RECTANGLE)
  }

  /**
   * 在指定位置插入一个换行符
   */
  private insertEnter(index: number, blocks: Block[], attr?: Partial<ILayoutFrameAttributes>) {
    blocks = blocks || this.findBlocksByRange(index, 0)
    if (index === 0 || blocks.length === 2) {
      const targetBlock = index === 0 ? this.head : blocks[1]
      if (targetBlock) {
        const newBlock = targetBlock.insertEnter(index - targetBlock.start, attr)
        if (newBlock) {
          this.addAfter(newBlock, targetBlock)
        }
      }
    } else if (blocks.length === 1) {
      const newBlock = blocks[0].insertEnter(index - blocks[0].start, attr)
      if (newBlock) {
        this.addAfter(newBlock, blocks[0])
      }
    } else {
      console.error('the blocks.length should not be ', blocks.length)
    }
  }

  /**
   * 在 document 里面找到设计到 range 范围的 block
   * @param index range 的开始位置
   * @param length range 的长度
   */
  private findBlocksByRange(index: number, length: number, intersectionType = EnumIntersectionType.both): Block[] {
    return findChildrenByRange<Block>(this.children, index, length, intersectionType)
  }

  /**
   * 获取指定坐标处的 block 信息
   * @param x x 坐标
   * @param y y 坐标
   */
  private findChildrenInPos(x: number, y: number): Block | null {
    let current = this.head
    if (current !== null) {
      while (current !== null && (y < current.y || y > current.y + current.height)) {
        current = current.nextSibling === this.endDrawingBlock ? null : current.nextSibling
      }
    }
    return current
  }

  /**
   * 计算某条 change 数据对应的 block type，null 表示普通行内数据
   * @param op 结构化的 delta 数据
   */
  private getBlockTypeFromOp(op: Op): EnumBlockType | null {
    let thisBlockType = null
    const data = op.insert
    if (data === '\n') {
      if (op.attributes && op.attributes.blockquote) {
        thisBlockType = EnumBlockType.QuoteBlock
      } else if (op.attributes && op.attributes['code-block']) {
        thisBlockType = EnumBlockType.CodeBlock
      } else if (op.attributes && (op.attributes['list-id'] || op.attributes['bullet-id'])) {
        thisBlockType = EnumBlockType.ListItem
      } else {
        thisBlockType = EnumBlockType.Paragraph
      }
    } else if (typeof data === 'object') {
      if (data.hasOwnProperty('location')) {
        thisBlockType = EnumBlockType.Location
      } else if (data.hasOwnProperty('attachment')) {
        thisBlockType = EnumBlockType.Attachment
      } else if (data.hasOwnProperty('divide')) {
        thisBlockType = EnumBlockType.Divide
      } else if (data.hasOwnProperty('rows') && data.hasOwnProperty('cols')) {
        thisBlockType = EnumBlockType.Table
      }
    }

    return thisBlockType
  }

  /**
   * 根据 change 信息生成 fragment
   */
  private getFragmentFromOp(op: Op): Fragment {
    const data = op.insert as any
    const attributes = op.attributes as any
    // 如果 data 是字符串说明是文字性内容
    if (typeof data === 'string') {
      if (data !== '\n') {
        // 如果不是换行符说明是普通内容
        return new FragmentText(attributes, data)
      } else {
        return new FragmentParaEnd()
      }
    } else if (typeof data === 'object') {
      if (data['gallery-block'] !== undefined || data.gallery !== undefined) {
        // 如果 gallery-block 存在说明是图片
        return new FragmentImage(attributes, data.gallery || data['gallery-block'])
      } else if (data['date-mention'] !== undefined) {
        // 如果 date-mention 存在说明是日期
        return new FragmentDate(attributes, data['date-mention'])
      } else if (data['inline-break'] === true) {
        // 如果是 list item 里的换行
        return new FragmentParaEnd()
      }
    }
    throw new Error('unknown fragment')
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
      let needRecalculateSelectionRect = false
      while (deadline.timeRemaining() > 5 && currentBlock !== undefined && currentBlock !== null) {
        if (currentBlock.needLayout) {
          hasLayout = hasLayout || currentBlock.needLayout
          needRecalculateSelectionRect = needRecalculateSelectionRect ||
            (
              this.selection !== null &&
              currentBlock.needLayout &&
              hasIntersection(
                this.selection.index,
                this.selection.index + this.selection.length,
                currentBlock.start,
                currentBlock.start + currentBlock.length,
              )
            )
          currentBlock.layout()
        }
        currentBlock = currentBlock.nextSibling
      }

      if (needRecalculateSelectionRect) {
        this.calSelectionRectangles()
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
          this.setSize({ height: currentBlock.y })
        }
      }
      requestIdleCallback(this.runIdleLayout)
    } else {
      this.idleLayoutRunning = false
      this.initLayout = true
      console.log('idle finished', performance.now() - (window as any).start)
    }
  }

  /**
   * 将指定 list id 的 listitem 标记为需要排版
   * @param listIds list id
   */
  private markListItemToLayout(listIds: Set<number>) {
    if (listIds.size > 0) {
      for (let blockIndex = 0; blockIndex < this.children.length; blockIndex++) {
        const element = this.children[blockIndex]
        if (element instanceof ListItem && listIds.has(element.attributes.listId)) {
          element.needLayout = true
        }
      }
    }
  }

  /**
   * 根据当前选区更新当前选区格式
   */
  private updateCurrentFormat() {
    if (this.selection === null) {
      this.currentFormat = null
    } else {
      const { index, length } = this.selection
      this.currentFormat = this.getFormat(index, length)
    }
    this.nextFormat = this.currentFormat
    this.em.emit(EventName.DOCUMENT_CHANGE_FORMAT, this.nextFormat)
  }

  /**
   * 更新 nextFormat
   * @param attr 更新的样式内容
   */
  private updateNextFormat(attr: IFragmentOverwriteAttributes) {
    if (this.nextFormat === null) {
      console.error('the nextFormat should not be null')
      return
    }
    let formatChanged = false

    const keys = Object.keys(attr)
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      if (this.nextFormat.hasOwnProperty(key) && !this.nextFormat[key].has(attr[key])) {
        this.nextFormat[key] = (new Set().add(attr[key]))
        formatChanged = true
      }
    }

    if (formatChanged) {
      this.nextFormat = { ...this.nextFormat }
      this.em.emit(EventName.DOCUMENT_CHANGE_FORMAT, this.nextFormat)
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

  /**
   * 查找从第几个选区矩形开始绘制选区矩形
   */
  private findSelectionArea(selectionArea: IRectangle[], scrollTop: number): number {
    let low = 0
    let high = selectionArea.length - 1

    let mid = Math.floor((low + high) / 2)
    while (high > low + 1) {
      const midValue = selectionArea[mid].y
      if (midValue < scrollTop) {
        low = mid
      } else if (midValue > scrollTop) {
        high = mid
      } else if (midValue === scrollTop) {
        break
      }
      mid = Math.floor((low + high) / 2)
    }

    for (; mid >= 0; mid--) {
      if (selectionArea[mid].y + selectionArea[mid].height < scrollTop) {
        break
      }
    }
    mid = Math.max(mid, 0)

    return mid
  }

  /**
   * 获取一系列 block 的 Op
   */
  private getBlocksOps(blocks: Block[]): Op[] {
    const res = []
    for (let index = 0; index < blocks.length; index++) {
      const element = blocks[index]
      res.push(...element.toOp())
    }
    return res
  }

  /**
   * 根据 delta 生成 block
   * 注意，这个方法只能处理 insert 操作
   */
  private readDeltaToBlocks(delta: Delta): Block[] {
    // 先倒序遍历一遍把 \n 拆成单独的 op
    for (let index = delta.ops.length - 1; index >= 0; index--) {
      const op = delta.ops[index]
      if (typeof op.insert === 'string' && op.insert.length > 1 && op.insert.indexOf('\n') >= 0) {
        const splitContent = op.insert.split('\n')
        if (splitContent.length > 1 && splitContent[splitContent.length - 1].length === 0) {
          splitContent.pop()
        }
        const splitOps: Op[] = []
        for (let index = 0; index < splitContent.length; index++) {
          const content = splitContent[index]
          if (content.length > 0) {
            splitOps.push({ insert: content, attributes: { ...op.attributes } })
          }
          splitOps.push({ insert: '\n', attributes: { ...op.attributes } })
        }
        delta.ops.splice(index, 1, ...splitOps)
      }
    }
    const res: Block[] = []
    const cache: Array<{ type: EnumBlockType; frames: Op[][] }> = []
    let frameCache: Op[] = []

    for (let index = 0; index < delta.ops.length; index++) {
      const op = delta.ops[index]
      if (op.insert === undefined) {
        console.warn('this method should not treat any Op other than insert')
        return []
      }

      const thisDataType = this.getBlockTypeFromOp(op)
      frameCache.push(op)
      if (thisDataType !== null) {
        cache.push({
          type: thisDataType,
          frames: [frameCache],
        })
        frameCache = []
      }
    }

    for (let i = cache.length - 1; i > 0; i--) {
      const { type } = cache[i]
      if (type === cache[i - 1].type) {
        if (
          type === EnumBlockType.QuoteBlock ||
          type === EnumBlockType.CodeBlock
        ) {
          cache[i - 1].frames.push(...cache[i].frames)
          cache.splice(i, 1)
        }
      }
    }

    for (let i = 0, l = cache.length; i < l; i++) {
      const currentBat = cache[i]
      switch (currentBat.type) {
        case EnumBlockType.Divide:
          // res.push(new Divide(editorConfig.canvasWidth));
          break
        case EnumBlockType.Location:
          // const locationData = currentBat.frames[0][0].insert as any;
          // res.push(new Location(locationData.location));
          break
        case EnumBlockType.Attachment:
          // const attachmentData = currentBat.frames[0][0].insert as any;
          // res.push(new Attachment(attachmentData.attachment, currentBat.frames[0][0].attributes));
          break
        case EnumBlockType.Table:
          // res.push(new Table());
          break
        case EnumBlockType.Paragraph:
          const frame = new LayoutFrame(
            currentBat.frames[0].map((change) => this.getFragmentFromOp(change)),
            currentBat.frames[0].slice(-1)[0].attributes,
          )
          res.push(new Paragraph([frame], editorConfig.canvasWidth))
          break
        case EnumBlockType.QuoteBlock:
          const quoteFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromOp(change)),
              bat.slice(-1)[0].attributes,
            )
          })
          res.push(new QuoteBlock(quoteFrames, editorConfig.canvasWidth))
          break
        case EnumBlockType.ListItem:
          const listItemAttributes = currentBat.frames.slice(-1)[0].slice(-1)[0].attributes

          const frameBat = splitIntoBat(currentBat.frames[0], (cur: any) => {
            return typeof cur.insert === 'object' && cur.insert['inline-break'] === true
          }, true)

          const frames = frameBat.map((b) => {
            const frags = b.map((change: any) => this.getFragmentFromOp(change))
            return new LayoutFrame(frags, {})
          })

          res.push(new ListItem(frames, listItemAttributes, editorConfig.canvasWidth))
          break
        case EnumBlockType.CodeBlock:
          // const codeFrames = currentBat.frames.map((bat) => {
          //   return new LayoutFrame(
          //     bat.map((change) => this.getFragmentFromOp(change)),
          //     bat.slice(-1)[0].attributes, editorConfig.canvasWidth,
          //   );
          // });
          // res.push(new CodeBlock(codeFrames));
          break
      }
    }

    return res
  }

  /**
   * 从 end 位置开始尝试合并相邻的 block
   */
  private tryMerge(start: Block, end: Block) {
    let canStop = false
    let current = end
    while (current && current.prevSibling) {
      if (current === start) {
        canStop = true
      }
      if (current.needMerge && current.constructor === current.prevSibling.constructor) {
        current.prevSibling.addAll(current.removeAll())
        current.prevSibling.needLayout = true
        const toRemove = current
        current = current.prevSibling
        this.remove(toRemove)
      } else if (canStop) {
        break
      } else {
        current = current.prevSibling
      }
    }
  }
}
