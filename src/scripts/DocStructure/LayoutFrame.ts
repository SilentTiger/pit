import isEqual from 'lodash/isEqual'
import trimStart from 'lodash/trimStart'
import Op from 'quill-delta/dist/Op'
import LineBreaker from '../../assets/linebreaker/linebreaker'
import { EventName } from '../Common/EnumEventName'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import { ISearchResult } from '../Common/ISearchResult'
import LayoutPiece from '../Common/LayoutPiece'
import { LinkedList } from '../Common/LinkedList'
import { measureTextWidth } from '../Common/Platform'
import { collectAttributes, convertFormatFromSets, EnumIntersectionType, findChildrenByRange, findKeyByValueInMap, increaseId, searchTextString, isPointInRectangle, findRectChildInPos } from '../Common/util'
import Line from '../RenderStructure/Line'
import Run from '../RenderStructure/Run'
import { createRun } from '../RenderStructure/runFactory'
import RunText from '../RenderStructure/RunText'
import { EnumAlign, EnumLineSpacing } from './EnumParagraphStyle'
import { IFormatAttributes } from './FormatAttributes'
import Fragment from './Fragment'
import { FragmentDateDefaultAttributes } from './FragmentDateAttributes'
import { FragmentImageDefaultAttributes } from './FragmentImageAttributes'
import FragmentParaEnd from './FragmentParaEnd'
import { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes'
import FragmentText from './FragmentText'
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from './FragmentTextAttributes'
import ILayoutFrameAttributes, { LayoutFrameDefaultAttributes } from './LayoutFrameAttributes'
import { IRenderStructure } from '../Common/IRenderStructure'
import { EnumCursorType } from '../Common/EnumCursorType'

export default class LayoutFrame extends LinkedList<Fragment> implements IRenderStructure {
  public prevSibling: this | null = null;
  public nextSibling: this | null = null;
  public parent: LayoutFrame | null = null;

  public start: number = 0;
  public length: number = 0;
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public maxWidth: number = 0;
  public firstIndent: number = 0; // 首行缩进值，单位 px
  public indentWidth: number = 0;
  public attributes: ILayoutFrameAttributes = { ...LayoutFrameDefaultAttributes };
  public lines: Line[] = [];

  public readonly id: number = increaseId();

  private minBaseline: number = 0;
  private minLineHeight: number = 0;

  private originAttrs: Partial<ILayoutFrameAttributes> = {};
  private readonly defaultAttrs = LayoutFrameDefaultAttributes;

  private isPointerHover: boolean = false
  private currentHoverLine: Line | null = null

  constructor(frags: Fragment[], attrs: any) {
    super()
    this.setAttributes(attrs)

    this.addAll(frags)
    this.calLength()
  }

  public destroy() {
    // todo
  }

  /**
   * 给当前 layoutframe 添加一行到最后并更新当前 layoutframe 的 size
   */
  public addLine(line: Line) {
    this.lines.push(line)
    line.em.on(EventName.LINE_CHANGE_SIZE, this.childrenSizeChangeHandler, this)

    const newWidth = Math.max(this.width, line.x + line.width)
    const newHeight = this.height + line.height
    this.setSize(newHeight, newWidth)
  }

  /**
   * 绘制当前 layoutframe
   * @param ctx canvas context
   * @param x 绘制位置的 x 坐标
   * @param y 绘制位置的 y 坐标
   * @param viewHeight 整个画布的高度
   */
  public draw(
    ctx: ICanvasContext,
    x: number,
    y: number,
    viewHeight: number,
  ) {
    for (let i = 0, l = this.lines.length; i < l; i++) {
      this.lines[i].draw(ctx, this.x + x, this.y + y, viewHeight)
    }
    if ((window as any).frameBorder || this.isPointerHover) {
      ctx.save()
      ctx.strokeStyle = 'blue'
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)
      ctx.restore()
    }
  }

  /**
   * 设置原始 attributes 并编辑计算最终呈现所使用的 attributes
   * @param attr attributes
   */
  public setAttributes(attr: any = {}) {
    this.setOriginAttrs(attr)
    this.compileAttributes()

    this.calcIndentWidth()
  }

  /**
   * 核心排版逻辑
   */
  public layout() {
    this.lines = []
    this.addLine(
      new Line(
        this.firstIndent + this.indentWidth, 0, this.attributes.linespacing,
        this.maxWidth - this.firstIndent - this.indentWidth,
        this.minBaseline, this.minLineHeight,
      ),
    )
    this.breakLines(this.calLineBreakPoint())
    // 如果当前段落是空的，要加一个空 run text
    const tailLine = this.lines[this.lines.length - 1]
    if (tailLine !== null && tailLine.children.length === 0) {
      tailLine.add(new RunText(this.children[0] as FragmentText, 0, 0, ''))
    }
    this.setIndex()
    for (let i = 0, l = this.lines.length; i < l; i++) {
      let align: EnumAlign
      if (this.attributes.align === EnumAlign.justify && i === l - 1) {
        align = EnumAlign.left
      } else if (this.attributes.align === EnumAlign.scattered) {
        align = EnumAlign.justify
      } else {
        align = this.attributes.align
      }
      this.lines[i].layout(align)
    }
  }

  /**
   * 设置当前 layoutframe 的最大宽度
   * @param width 宽度
   */
  public setMaxWidth(width: number) {
    this.maxWidth = width
  }

  /**
   * 设置当前 layoutframe 首行缩进距离
   * @param firstIndent 首行缩进距离
   */
  public setFirstIndent(firstIndent: number) {
    this.firstIndent = firstIndent
  }

  /**
   * 设置最小 metrics
   */
  public setMinMetrics(metrics: { baseline: number, bottom: number }) {
    this.minBaseline = metrics.baseline
    this.minLineHeight = metrics.bottom
  }

  /**
   * 根据坐标获取文档中的位置
   */
  public getDocumentPos(x: number, y: number): number {
    let line: Line | null = null
    let lineIndex = 0

    for (const l = this.lines.length; lineIndex < l; lineIndex++) {
      line = this.lines[lineIndex]
      if (
        (line.y <= y && y <= line.y + line.height) ||
        (y < line.y && lineIndex === 0) ||
        (y > line.y + line.height && lineIndex === this.lines.length - 1)
      ) {
        lineIndex++
        break
      }
    }
    lineIndex--
    if (line === null) { return -1 }

    let run: Run | null = null
    let runIndex = 0
    let runStart = 0

    // 如果 y 坐标比行 y 坐标还小把 x 坐标改成 -1 来选中这一行的最前面一个位置
    // 如果 y 坐标比行 y + 高度 坐标还大把 x 坐标改成 行宽 + 1 来选中这一行的最后面一个位置
    if (y < line.y) {
      x = -1
    } else if (y > line.y + line.height) {
      x = line.width + 1
    }

    if (x <= line.x) {
      run = line.head
    } else if (x >= line.x + line.width) {
      run = line.tail
      runIndex = line.children.length - 1
      runStart = line.length - run!.length // line 不可能是空的，所以这里的 run 也不可能是 null
    } else {
      x = x - line.x
      for (const l = line.children.length; runIndex < l; runIndex++) {
        run = line.children[runIndex]
        const runEnd = run.x + run.width
        if (
          (run.x <= x && x <= runEnd) ||
          (run.nextSibling !== null && runEnd < x && x < run.nextSibling.x)
        ) {
          break
        }
        runStart += run.length
      }
    }

    if (run === null) { return -1 }

    let posData = run.getDocumentPos(x - run.x, y - line.y - run.y, false)
    if (posData === -1) {
      if (runIndex === 0) {
        posData = run.getDocumentPos(x - run.x, y - line.y - run.y, true)
      } else {
        run = run.prevSibling as Run // runIndex !== 0 时 prevSibling 肯定不是 null
        runStart -= run.length
        posData = run.getDocumentPos(run.width, y - line.y - run.y, false)
      }
    }
    posData += line.start + runStart
    return posData
  }

  /**
   * 计算指定选区的矩形区域
   */
  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    const rects: IRectangle[] = []
    for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
      const line = this.lines[lineIndex]
      if (line.start + line.length < index) { continue }
      if (line.start > index + length) { break }

      const lineStart = Math.max(0, index - line.start)
      const lineLength = Math.min(length, index + length - line.start)

      let runStart = 0

      let startX = 0
      let endX = 0
      for (let runIndex = 0; runIndex < line.children.length; runIndex++) {
        const run = line.children[runIndex]
        if (lineStart >= runStart && lineStart <= runStart + run.length) {
          // 找到了起始位置
          startX = run.getCoordinatePosX(lineStart - runStart) + run.x + line.x
        }

        if (runStart + run.length === lineLength + lineStart) {
          endX = run.x + run.width + line.x
        } else if (lineLength + lineStart < runStart + run.length) {
          // 找到了结束位置
          endX = run.getCoordinatePosX(lineLength + lineStart - runStart) + run.x + line.x
          break
        }
        endX = endX || (line.width + line.x)
        runStart += run.length
      }

      rects.push({
        x: startX + this.x,
        y: line.y + this.y,
        width: endX - startX,
        height: line.height,
      })
    }
    return rects
  }

  /**
   * 设置当前 layoutFrame 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number, recursive = true, force = false): void {
    if (force === true || this.y !== y) {
      y = Math.floor(y)
      this.y = y
      if (recursive) {
        let currentBlock = this
        let nextSibling = this.nextSibling
        while (nextSibling !== null) {
          nextSibling.y = (Math.floor(currentBlock.y + currentBlock.height))
          currentBlock = nextSibling
          nextSibling = currentBlock.nextSibling
        }
      }
    }
  }

  /**
   * 设置起始索引
   */
  public setStart(index: number, recursive = false, force = false): void {
    if (force === true || this.start !== index) {
      this.start = index
      if (recursive) {
        let currentFrame: LayoutFrame = this
        let nextSibling = currentFrame.nextSibling
        while (nextSibling !== null) {
          nextSibling.start = currentFrame.start + currentFrame.length
          currentFrame = nextSibling
          nextSibling = currentFrame.nextSibling
        }
        if (this.parent !== null) {
          this.parent.length = currentFrame.start + currentFrame.length
        }
      }
    }
  }

  /**
   * 输出为 delta
   */
  public toOp(): Op[] {
    const res = new Array(this.children.length)
    for (let index = 0; index < this.children.length - 1; index++) {
      const element = this.children[index]
      res[index] = element.toOp()
    }
    res[res.length - 1] = {
      insert: '\n',
      attributes: { ...this.originAttrs },
    }

    return res
  }

  /**
   * 输出为 html
   */
  public toHtml(): string {
    const style =
      `line-height:${this.attributes.linespacing};` +
      `text-align:${this.attributes.align};` +
      `padding-left:${this.attributes.indent}px`
    const htmlContent = this.children.length === 1 ? '<br>'
      : this.children.map((frag) => frag.toHtml()).join('')
    return `<div style=${style}>${htmlContent}</div>`
  }

  /**
   * 在当前 layoutframe 中插入内容
   * @param content 要插入的内容
   * @param index 插入位置
   * @param hasDiffFormat 插入内容的格式和当前位置的格式是否存在不同
   */
  public insertText(content: string, index: number, hasDiffFormat: boolean, attr?: Partial<IFragmentTextAttributes>, composing = false) {
    const frags = this.findFragmentsByRange(index, length)
    const fragsLength = frags.length
    const firstFrag = frags[0]
    attr = attr || convertFormatFromSets(this.getFormat(index, 0))
    // 如果只有一个，肯定是在某个 frag 的最前面插入内容，或者是在某个 frag 中间插入内容
    if (fragsLength === 1) {
      // 如果格式不同或者虽然格式相同但是第一个 frag 不是 fragment text，就直接插入新的 fragment text
      if (index === 0) {
        // 如果是要把内容插入当前 layoutframe 的最前面
        if (hasDiffFormat || !(firstFrag instanceof FragmentText)) {
          const newFrag = new FragmentText(attr, content)
          this.addAtIndex(newFrag, 0)
        } else {
          if (firstFrag.attributes.composing && composing) {
            firstFrag.setContent(content)
          } else {
            firstFrag.insert(content, 0)
          }
        }
      } else {
        // 如果是要在某个 fragment 中间插入内容
        // 此时这个 fragment 肯定是 fragment text，因为目前系统里面只有 fragment text 的长度是大于 1 的
        if (hasDiffFormat) {
          // 如果设置的格式和当前格式不同就要把这个 fragment text 拆开
          const currentContent = (firstFrag as FragmentText).content
          const splitContent = [currentContent.substr(0, index - firstFrag.start), currentContent.substr(index - firstFrag.start)];
          (firstFrag as FragmentText).setContent(splitContent[0])
          const newFrag1 = new FragmentText(attr, content) // 新插入的内容
          this.addAfter(newFrag1, firstFrag)
          const newFrag2 = new FragmentText({ ...firstFrag.attributes }, splitContent[1]) // 被拆开的 fragment text 的后半段内容
          this.addAfter(newFrag2, newFrag1)
        } else {
          firstFrag.insert(content, index - firstFrag.start)
        }
      }
    } else if (fragsLength === 2) {
      // 如果 newFrag === false，而且第一个 frag 是 fragment text，就直接在其中插入内容
      // 否则就之间创建新的 fragment text 并尝试和后面的 frag 合并
      if (!hasDiffFormat && firstFrag instanceof FragmentText) {
        if (composing) {
          firstFrag.setContent(content)
        } else {
          firstFrag.insert(content, index - firstFrag.start)
        }
      } else {
        let needInsertFrag = true
        const secondFrag = frags[1]
        if (secondFrag instanceof FragmentText && !composing) {
          // 比较 frags[1] 的格式和要插入的格式内容是否相同，如果是的就直接插入内容，否则就创建新的 frag
          const targetAttribute = secondFrag.attributes
          const attrKeys = Object.keys(targetAttribute)
          let same = true
          for (let i = 0; i < attrKeys.length; i++) {
            if (targetAttribute[attrKeys[i]] !== attr[attrKeys[i]]) {
              same = false
              break
            }
          }
          if (same) {
            secondFrag.insert(content, 0)
            needInsertFrag = false
          }
        }
        if (needInsertFrag) {
          const newFrag = new FragmentText(attr, content)
          this.addAfter(newFrag, firstFrag)
        }
      }
    }
    this.calLength()
  }

  /**
   * 在指定位置插入一个完整的 fragment
   * @param fragment 要插入的 fragment
   * @param index 插入的位置
   */
  public insertFragment(fragment: Fragment, index: number) {
    // todo
  }

  /**
   * 在指定位置插入一个换行符
   * @returns 返回插入位置后面的所有 fragment
   */
  public insertEnter(index: number): Fragment[] {
    const frags = this.findFragmentsByRange(index, 0)
    const paraEnd = new FragmentParaEnd()
    let splitFrags: Fragment[] = []
    if (frags.length === 1) {
      // frags.length === 1 说明可能是要把某个 frag 切成两个，也可能是在当前 layoutframe 最前面插入换行符
      if (index === 0) {
        splitFrags = this.removeAll()
      } else {
        // 如果逻辑进入这里，那么找到的这个 frag 一定是一个 fragmentText，拆分这个 fragmentText
        const fragText = frags[0] as FragmentText
        const newContent = fragText.content.substr(index - fragText.start)
        fragText.delete(index - fragText.start)
        splitFrags = this.removeAllFrom(fragText.nextSibling!) // 这里 next 肯定不是 null，至少后面有一个 paraEnd
        const newFragText = new FragmentText({ ...fragText.attributes }, newContent)
        splitFrags.unshift(newFragText)
      }
    } else if (frags.length === 2) {
      // 如果长度是 2，说明正好在 两个 frag 之间插入换行
      splitFrags = this.removeAllFrom(frags[1])
    } else {
      console.error('the frags.length should not be ', frags.length)
    }

    this.add(paraEnd)
    this.calLength()
    return splitFrags
  }

  /**
   * 删除当前 layoutframe 中的指定内容
   * @param index 删除范围开始位置
   * @param length 删除范围长度
   */
  public delete(index: number, length: number = this.length - index) {
    const frags = this.findFragmentsByRange(index, length)
    if (frags.length <= 0) { return }

    // 尝试合并属性相同的 fragment
    let mergeStart: Fragment | null = null
    if (frags[0].prevSibling !== null) {
      mergeStart = frags[0].prevSibling
    } else if (frags[0].start < index) {
      mergeStart = frags[0]
    } else if (index + length > frags[frags.length - 1].start + frags[frags.length - 1].length) {
      mergeStart = frags[frags.length - 1]
    }
    const mergeEnd = frags[frags.length - 1].nextSibling || this.tail

    for (let fragIndex = 0; fragIndex < frags.length; fragIndex++) {
      const element = frags[fragIndex]
      if (index <= element.start && index + length >= element.start + element.length) {
        this.remove(element)
        index -= element.length
      } else {
        const offsetStart = Math.max(index - element.start, 0)
        const offsetLength = Math.min(element.start + element.length, index + length) - element.start - offsetStart
        element.delete(offsetStart, offsetLength)
        index -= offsetLength
      }
    }
    this.calLength()

    if (mergeStart !== null) {
      let current = mergeStart
      let next = current.nextSibling
      while (current !== mergeEnd && current instanceof FragmentText && next instanceof FragmentText) {
        // 如果当前 frag 和后面的 frag 都是 fragment text，且属性相同，就合并
        if (isEqual(current.attributes, next.attributes)) {
          current.content = current.content + next.content
          this.remove(next)
          next = current.nextSibling
        } else {
          current = next
          next = next.nextSibling
        }
      }
    }
  }

  /**
   * 将指定范围的内容替换为指定内容
   */
  public replace(index: number, length: number, replaceWords: string) {
    this.insertText(replaceWords, index + length, false)
    this.delete(index, length)
  }

  /**
   * 给指定范围的文档内容设置格式
   */
  public format(attr: IFormatAttributes, index: number, length: number) {
    this.formatSelf(attr)
    const frags = this.findFragmentsByRange(index, length)
    if (frags.length <= 0) { return }

    // 尝试合并属性相同的 fragment
    const mergeStart = frags[0].prevSibling || frags[0]
    const mergeEnd = frags[frags.length - 1].nextSibling || this.tail

    for (let fragIndex = 0; fragIndex < frags.length; fragIndex++) {
      const element = frags[fragIndex]
      if (index <= element.start && index + length >= element.start + element.length) {
        element.format(attr)
      } else {
        const offsetStart = Math.max(index - element.start, 0)
        const offsetLength = Math.min(element.start + element.length, index + length) - element.start - offsetStart
        if (offsetLength > 0) {
          element.format(attr, { index: offsetStart, length: offsetLength })
        }
      }
    }

    if (mergeStart !== null) {
      let current = mergeStart
      let next = current.nextSibling
      while (current !== mergeEnd && current instanceof FragmentText && next instanceof FragmentText) {
        // 如果当前 frag 和后面的 frag 都是 fragment text，且属性相同，就合并
        if (isEqual(current.attributes, next.attributes)) {
          current.content = current.content + next.content
          this.remove(next)
          next = current.nextSibling
        } else {
          current = next
          next = next.nextSibling
        }
      }
    }
  }

  /**
   * 清除选区范围内容的格式
   */
  public clearFormat(index: number, length: number) {
    this.format({
      ...LayoutFrameDefaultAttributes,
      ...FragmentTextDefaultAttributes,
      ...FragmentImageDefaultAttributes,
      ...FragmentDateDefaultAttributes,
      ...FragmentParaEndDefaultAttributes,
    }, index, length)
  }

  /**
   * 获取指定选区中所含格式
   * @param index 选区开始位置
   * @param length 选区长度
   */
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const frags = this.findFragmentsByRange(index, length, EnumIntersectionType.leftFirst)
    const res: { [key: string]: Set<any> } = {}
    for (let fragIndex = 0; fragIndex < frags.length; fragIndex++) {
      collectAttributes(frags[fragIndex].getFormat(), res)
    }
    // linespacing 需要反向映射
    const attrs: {
      [key: string]: any;
    } = { ...this.attributes }
    const findKeyRes = findKeyByValueInMap(EnumLineSpacing, attrs.linespacing)
    if (findKeyRes.find) {
      attrs.linespacing = findKeyRes.key[0]
    }
    collectAttributes(attrs, res)
    return res
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean) {
    const currentIndent = this.attributes.indent
    const step = increase ? 1 : -1
    let newIndent = currentIndent + step
    newIndent = Math.min(newIndent, 8)
    newIndent = Math.max(newIndent, 0)
    this.setAttributes({
      indent: newIndent,
    })
  }

  /**
   * 合并两个 layoutframe
   */
  public eat(frame: LayoutFrame) {
    const oldTail = this.tail
    this.addAll(frame.children)
    if (
      oldTail instanceof FragmentText &&
      oldTail.nextSibling instanceof FragmentText &&
      isEqual(oldTail.attributes, oldTail.nextSibling.attributes)
    ) {
      oldTail.content = oldTail.content + oldTail.nextSibling.content
      this.remove(oldTail.nextSibling)
    }
    this.calLength()
  }

  /**
   * 计算当前 layoutframe 的长度
   */
  public calLength() {
    this.length = 0
    for (let index = 0; index < this.children.length; index++) {
      this.length += this.children[index].length
    }
  }

  /**
   * 搜索
   */
  public search(keywords: string): ISearchResult[] {
    const res: ISearchResult[] = []
    const currentFragmentText: FragmentText[] = []
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrag = this.children[i]
      if (currentFrag instanceof FragmentText) {
        currentFragmentText.push(currentFrag)
      } else if (currentFragmentText.length > 0) {
        // 说明上一批 fragment text 已经确定，开始处理
        const batTextContent = currentFragmentText.map((ft) => ft.content).join('')
        const searchPosRes = searchTextString(keywords, batTextContent)
        if (searchPosRes.length > 0) {
          for (let j = 0; j < searchPosRes.length; j++) {
            searchPosRes[j] += currentFragmentText[0].start
            const pos = searchPosRes[j]
            const rects = this.getSelectionRectangles(pos, keywords.length)
            res.push({
              pos,
              rects,
            })
          }
        }
        // 已经处理完 currentFragmentText，清空 currentFragmentText
        currentFragmentText.length = 0
      }
    }
    if (currentFragmentText.length > 0) {
      const batTextContent = currentFragmentText.map((ft) => ft.content).join('')
      const searchPosRes = searchTextString(keywords, batTextContent)
      if (searchPosRes.length > 0) {
        for (let j = 0; j < searchPosRes.length; j++) {
          searchPosRes[j] += currentFragmentText[0].start
          const pos = searchPosRes[j]
          const rects = this.getSelectionRectangles(pos, keywords.length)
          res.push({
            pos,
            rects,
          })
        }
      }
    }

    return res
  }

  public getChildrenStackByPos(x: number, y: number): Array<IRenderStructure> {
    const child = findRectChildInPos(x, y, this.lines)
    let res
    if (child) {
      res = child.getChildrenStackByPos(x - child.x, y - child.y)
      res.unshift(this)
    } else {
      res = [this]
    }
    return res
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.Default
  }

  public onPointerEnter(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number) {
    if (this.currentHoverLine) {
      console.trace('strange')
    } else {
      const hoverLine = targetStack[currentTargetIndex + 1] as Line
      if (hoverLine) {
        hoverLine.onPointerEnter(x - hoverLine.x, y - hoverLine.y, targetStack, currentTargetIndex + 1)
        this.currentHoverLine = hoverLine
      }
    }
    this.isPointerHover = true
  }
  public onPointerLeave() {
    if (this.currentHoverLine) {
      this.currentHoverLine.onPointerLeave()
      this.currentHoverLine = null
    }
    this.isPointerHover = false
  }
  public onPointerMove(x: number, y: number, targetStack: IRenderStructure[], currentTargetIndex: number): void {
    if (this.currentHoverLine) {
      if (this.currentHoverLine === targetStack[currentTargetIndex + 1]) {
        this.currentHoverLine.onPointerMove(x - this.currentHoverLine.x, y - this.currentHoverLine.y, targetStack, currentTargetIndex + 1)
        return
      } else {
        this.currentHoverLine.onPointerLeave()
        this.currentHoverLine = null
      }
    }
    const hoverLine = targetStack[currentTargetIndex + 1] as Line
    if (hoverLine) {
      hoverLine.onPointerEnter(x - hoverLine.x, y - hoverLine.y, targetStack, currentTargetIndex + 1)
      this.currentHoverLine = hoverLine
    }
  }
  public onPointerDown(x: number, y: number): void {
    if (this.currentHoverLine) {
      this.currentHoverLine.onPointerDown(x - this.currentHoverLine.x, y - this.currentHoverLine.y)
    }
  }
  public onPointerUp(x: number, y: number): void {
    if (this.currentHoverLine) {
      this.currentHoverLine.onPointerUp(x - this.currentHoverLine.x, y - this.currentHoverLine.y)
    }
  }
  public onPointerTap(x: number, y: number) {
    if (this.currentHoverLine) {
      this.currentHoverLine.onPointerTap(x - this.currentHoverLine.x, y - this.currentHoverLine.y)
    }
  }

  /**
   * 计算断行点，计算当前 layoutframe 的内容中哪里可以断行
   */
  private calLineBreakPoint(): LayoutPiece[] {
    const res: LayoutPiece[] = []
    // 已经获得了段落的所有数据，准备开始排版
    // 从 0 开始遍历 所有 fragment，如果是 fragment text 就拿到文字内容，直到遇到非 fragment text
    // 这里非 fragment text 的 fragment 应该肯定是会分配一个单独的 run 的
    // 则前面的一系列 fragment text 拿到所以文字内容一起进行 line break
    // 遍历所有的 break
    // 先找出这个 break 是属于哪个 fragment text 的
    // 如果某个 break 完整的包含于某个 fragment text 中，则直接度量这个 break 的长度并尝试插入当前的 line
    // 如果某个 break 不是完整包含于某个 fragment text 说明这个， break 是跨 fragment text 的
    // 则遍历这个 break 中的每个字符判断其属于哪个 fragment text，并将属同一个 fragment text 的字符放置于一个 run 中，并度量其长度
    // 将这个 break 的所有 run 的长度求和后看能不能插入当前 line
    const currentFragmentText: FragmentText[] = []
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrag = this.children[i]
      if (currentFrag instanceof FragmentText) {
        currentFragmentText.push(currentFrag)
      } else {
        // 说明上一批 fragment text 已经确定，开始处理
        res.push(...this.constructLayoutPieces(currentFragmentText))
        // 已经处理完 currentFragmentText，清空 currentFragmentText
        currentFragmentText.length = 0
        // 如果不是 fragment text，则作为单独的 run 插入当前 line
        const piece = new LayoutPiece(true)
        piece.frags = [{ frag: currentFrag, start: 0, end: 1 }]
        piece.calTotalWidth()
        res.push(piece)
      }
    }
    if (currentFragmentText.length > 0) {
      res.push(...this.constructLayoutPieces(currentFragmentText))
    }

    return res
  }

  /**
   * 给当前 layoutframe 设置格式
   */
  private formatSelf(attr: IFormatAttributes) {
    this.setAttributes(attr)
  }

  /**
   * 根据第三方的算法将 fragment text 的内容拆成可以折行的内容片段（piece）
   * 后续会根据这些内容片段来把内容拆到行里面
   */
  private constructLayoutPieces(frags: FragmentText[]): LayoutPiece[] {
    if (frags.length === 0) {
      return []
    }
    const res: LayoutPiece[] = []
    const totalString = frags.map((frag) => frag.content).join('')

    // 然后开始计算断行点
    const breaker = new LineBreaker(totalString)
    let breakStart = frags[0].start
    let bk = breaker.nextBreak()
    let last = 0
    while (bk) {
      const word = totalString.slice(last, bk.position)
      last = bk.position
      bk = breaker.nextBreak()

      // 先处理开头的空格
      const noLeadSpaceWord = trimStart(word)
      let leadSpaceCount = word.length - noLeadSpaceWord.length
      const leadSpaceCountTemp = leadSpaceCount
      if (leadSpaceCount > 0) {
        const piece = new LayoutPiece(false)
        piece.isSpace = true
        piece.text = ''
        while (leadSpaceCount > 0) {
          piece.text += ' '
          leadSpaceCount--
        }
        piece.frags = this.getFragsForLayoutPiece(frags, piece, breakStart)
        piece.calTotalWidth()
        res.push(piece)
        breakStart += leadSpaceCountTemp
      }

      const finalWord = noLeadSpaceWord.trim()
      let spaceCount = noLeadSpaceWord.length - finalWord.length

      if (finalWord.length > 0) {
        const piece = new LayoutPiece(false)
        piece.isSpace = false
        piece.text = finalWord

        const layoutPieceFrags = this.getFragsForLayoutPiece(frags, piece, breakStart)
        piece.frags = layoutPieceFrags
        piece.calTotalWidth()
        res.push(piece)
      }
      breakStart += finalWord.length

      if (spaceCount > 0) {
        const spaceCountTemp = spaceCount
        const piece = new LayoutPiece(false)
        piece.isSpace = true
        piece.text = ''
        while (spaceCount > 0) {
          piece.text += ' '
          spaceCount--
        }
        piece.frags = this.getFragsForLayoutPiece(frags, piece, breakStart)
        piece.calTotalWidth()
        res.push(piece)
        breakStart += spaceCountTemp
      }
    }

    return res
  }

  /**
   * 计算某个 layout piece 覆盖了那些 fragment text
   */
  private getFragsForLayoutPiece(frags: FragmentText[], piece: LayoutPiece, start: number) {
    const res: Array<{
      start: number,
      end: number,
      frag: FragmentText,
    }> = []

    for (let i = 0, l = frags.length; i < l; i++) {
      const frag = frags[i]
      if (
        !((frag.start + frag.length - 1 < start) ||
          (frag.start >= start + piece.text.length))
      ) {
        res.push({
          start: Math.max(start, frag.start) - start,
          end: Math.min(start + piece.text.length, frag.start + frag.length) - start,
          frag,
        })
      }
    }
    return res
  }

  /**
   * 将折行算法拆出来的内容片段分行
   */
  private breakLines(pieces: LayoutPiece[]) {
    /**
     * 遍历所有的 piece
     * 如果当前 piece 能放入 tail line，就插入此行，这里还要看这个 piece 是几个 fragment
     * 否则新建行再看能否插入
     * 如能则进入下一个循环
     * 如不能，则看能否拆分当前 piece，
     * 不能则强行插入此行并创建新行，然后进入下一个循环
     * 能拆分，则依次计算 piece 中所有字符宽度
     * 然后为每一行尽可能放入更多内容
     */

    for (let i = 0, l = pieces.length; i < l; i++) {
      let tailLine = this.lines[this.lines.length - 1]
      const freeSpace = this.maxWidth - tailLine.x - tailLine.width
      const currentPiece = pieces[i]
      if (currentPiece.totalWidth <= freeSpace || currentPiece.isSpace) {
        if (currentPiece.isHolder) {
          const run = createRun(currentPiece.frags[0].frag, 0, 0)
          const size = run.calSize()
          run.setSize(size.height, size.width)
          tailLine.add(run)
        } else {
          if (currentPiece.frags.length === 1) {
            const run = new RunText(currentPiece.frags[0].frag as FragmentText, 0, 0, currentPiece.text)
            run.setSize(run.calHeight(), currentPiece.totalWidth)
            run.isSpace = currentPiece.isSpace
            tailLine.add(run)
          } else {
            for (let index = 0, fl = currentPiece.frags.length; index < fl; index++) {
              const frag = currentPiece.frags[index]
              const run = new RunText(frag.frag as FragmentText, 0, 0,
                currentPiece.text.substring(frag.start, frag.end))
              run.setSize(run.calHeight(), currentPiece.fragWidth[index])
              run.isSpace = currentPiece.isSpace
              tailLine.add(run)
            }
          }
        }
      } else {
        // 如果不能把整个 piece 放入 tail line， 就看是否需要创建新行再尝试拆分这个 piece
        if (tailLine.children.length > 0) {
          this.addLine(
            new Line(
              this.indentWidth, Math.floor(tailLine.y + tailLine.height),
              this.attributes.linespacing, this.maxWidth - this.indentWidth,
              this.minBaseline, this.minLineHeight,
            ),
          )
          i--
          continue
        } else {
          // 如果是空行就看这个 piece 是不是 holder，是 holder 直接插入，加新行，进入下一个循环
          if (currentPiece.isHolder) {
            const run = createRun(currentPiece.frags[0].frag, 0, 0)
            const size = run.calSize()
            run.setSize(size.height, size.width)
            tailLine.add(run)
            this.addLine(
              new Line(
                this.indentWidth, Math.floor(tailLine.y + tailLine.height),
                this.attributes.linespacing, this.maxWidth - this.indentWidth,
                this.minBaseline, this.minLineHeight,
              ),
            )
            continue
          }
        }
        // 这里用一个嵌套循环来尝试拆分 piece，外层循环拆 piece 中的 frag，内层循环拆某个 frag 中的字符
        let fragIndex = 0
        while (fragIndex < currentPiece.frags.length) {
          let lineFreeSpace = this.maxWidth - tailLine.x - tailLine.width
          const currentFrag = currentPiece.frags[fragIndex]
          if (currentPiece.fragWidth[fragIndex] <= lineFreeSpace) {
            // 如果拆分 frag 后 frag 可以插入就插入并进入下一个循环
            const run = new RunText(currentFrag.frag as FragmentText, 0, 0,
              currentPiece.text.substring(currentFrag.start, currentFrag.end))
            run.setSize(run.calHeight(), currentPiece.fragWidth[fragIndex])
            run.isSpace = currentPiece.isSpace
            tailLine.add(run)
            lineFreeSpace -= currentPiece.fragWidth[fragIndex]
          } else {
            // 如果拆分后 frag 不能插入，就再拆分这个 frag 到字符，再尝试插入
            let charStartIndex = 0

            while (currentFrag.start + charStartIndex < currentFrag.end) {
              for (let length = currentFrag.end - currentFrag.start - charStartIndex; length > 0; length--) {
                const text = currentPiece.text.substr(currentFrag.start + charStartIndex, length)
                const charPieceWidth = measureTextWidth(
                  text, (currentFrag.frag as FragmentText).attributes,
                )
                if (charPieceWidth <= lineFreeSpace) {
                  // 如果空间足够就插入
                  const run = new RunText(currentFrag.frag as FragmentText, 0, 0, text)
                  run.setSize(run.calHeight(), charPieceWidth)
                  run.isSpace = currentPiece.isSpace
                  tailLine.add(run)
                  lineFreeSpace -= charPieceWidth
                  charStartIndex += length
                  // 如果这个 frag 已经处理完了，就 break 进去下一个 frag 的循环
                  // 如果这个 frag 还没处理完，就创建新 line 继续处理这个 frag 剩下的内容
                  if (currentFrag.start + charStartIndex < currentFrag.end) {
                    // 说明还有没有处理完的部分
                    tailLine = new Line(
                      this.indentWidth, Math.floor(tailLine.y + tailLine.height),
                      this.attributes.linespacing, this.maxWidth - this.indentWidth,
                      this.minBaseline, this.minLineHeight,
                    )
                    this.addLine(tailLine)
                    lineFreeSpace = this.maxWidth - tailLine.x - tailLine.width
                  }
                  break
                } else {
                  if (length === 1) {
                    // 如果当前只有一个字符，就看是不是空行，是空行就强行插入这个字符，否则创建新行重新跑循环
                    if (tailLine.children.length === 0) {
                      const run = new RunText(currentFrag.frag as FragmentText, 0, 0, text)
                      run.setSize(run.calHeight(), charPieceWidth)
                      run.isSpace = currentPiece.isSpace
                      tailLine.add(run)
                      charStartIndex += 1
                    } else {
                      tailLine = new Line(
                        this.indentWidth, Math.floor(tailLine.y + tailLine.height),
                        this.attributes.linespacing, this.maxWidth - this.indentWidth,
                        this.minBaseline, this.minLineHeight,
                      )
                      this.addLine(tailLine)
                      // 这里要重新计算 length 和 lineFreeSpace
                      length = currentFrag.end - charStartIndex + 2
                      lineFreeSpace = this.maxWidth - tailLine.x - tailLine.width
                      break
                    }
                  }
                }
              }
            }
          }
          fragIndex++
        }
      }
    }
  }

  /**
   * 设置当前 layoutframe 的 size
   */
  private setSize(height: number, width: number) {
    this.width = width
    this.height = height
  }

  private childrenSizeChangeHandler() {
    const size = this.calSize()
    this.setSize(size.height, size.width)
  }

  /**
   * 遍历所有的行计算当前 layoutframe 的 size
   */
  private calSize() {
    let newWidth = 0
    let newHeight = 0
    this.lines.forEach((item) => {
      newWidth = Math.max(newWidth, item.x + item.width)
    })
    const lastLine = this.lines[this.lines.length - 1]
    newHeight = lastLine.y + lastLine.height
    return {
      width: newWidth,
      height: newHeight,
    }
  }

  /**
   * 给当前 layoutframe 的所有行设置 index
   */
  private setIndex() {
    for (let index = 0; index < this.lines.length; index++) {
      const element = this.lines[index]
      if (index === 0) {
        element.start = 0
      } else {
        element.start = this.lines[index - 1].start + this.lines[index - 1].length
      }
    }
  }

  /**
   * 在 LayoutFrame 里面找到设计到 range 范围的 fragment
   * @param index range 的开始位置
   * @param length range 的长度
   */
  private findFragmentsByRange(
    index: number, length: number,
    intersectionType: EnumIntersectionType = EnumIntersectionType.both,
  ): Fragment[] {
    return findChildrenByRange<Fragment>(this.children, index, length, intersectionType)
  }

  /**
   * 设置原始 attributes
   * @param attrs attributes
   */
  private setOriginAttrs(attrs: any) {
    const keys = Object.keys(this.defaultAttrs)
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      if (this.defaultAttrs.hasOwnProperty(key) && attrs.hasOwnProperty(key)) {
        if (attrs[key] !== this.defaultAttrs[key]) {
          this.originAttrs[key] = attrs[key]
        } else {
          delete this.originAttrs[key]
        }
      }
    }
  }

  /**
   * 编译计算最终的 attributes
   */
  private compileAttributes() {
    const linespacingAttr: any = {}
    if (this.originAttrs.linespacing !== undefined) {
      const ls = EnumLineSpacing.get(this.originAttrs.linespacing)
      if (!isNaN(ls)) {
        linespacingAttr.linespacing = ls
      }
    }
    this.attributes = { ...this.defaultAttrs, ...this.originAttrs, ...linespacingAttr }
  }

  /**
   * 计算当前 layoutframe 缩进距离
   */
  private calcIndentWidth() {
    this.indentWidth = this.attributes.indent > 0 ? this.attributes.indent * 20 + 6 : 0
  }
}
