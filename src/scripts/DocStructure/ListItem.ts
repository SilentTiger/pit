import Op from 'quill-delta-enhanced/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import { convertPt2Px, createTextFontString, measureTextMetrics, measureTextWidth } from '../Common/Platform'
import { calListItemTitle, calListTypeFromChangeData, collectAttributes } from '../Common/util'
import { EnumListType } from './EnumListStyle'
import { EnumFont } from './EnumTextStyle'
import { IFormatAttributes } from './FormatAttributes'
import LayoutFrame from './LayoutFrame'
import IListItemAttributes, { ListItemDefaultAttributes } from './ListItemAttributes'
import IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import { DocPos } from '../Common/DocPos'

export default class ListItem extends BlockCommon {
  public static readonly blockType: string = 'list'
  public attributes: IListItemAttributes = { ...ListItemDefaultAttributes };
  public titleContent = '';
  public titleWidth = 0;
  public titleBaseline = 0;
  public titleIndex: number = 0;
  public titleParent: string = '';
  private originAttrs: Partial<IListItemAttributes> = {};
  private readonly defaultAttrs = ListItemDefaultAttributes;

  public readFromOps(Ops: Op[]): void {
    const frames = super.readOpsToLayoutFrame(Ops)
    this.addAll(frames)
    this.setFrameStart()
    this.setAttributes(Ops[Ops.length - 1].attributes)
  }

  /**
   * 重新排版当前 ListItem
   */
  public layout() {
    if (this.needLayout) {
      this.setTitleIndex()
      this.setTitleContent(calListItemTitle(
        this.attributes.listType,
        this.attributes.liIndent,
        this.titleIndex,
        this.titleParent,
      ))

      // 先对列表项 title 文字排版，算出宽度、行高、baseline 位置
      this.titleWidth = measureTextWidth(this.titleContent, {
        italic: false,
        bold: false,
        size: this.attributes.liSize,
        font: EnumFont.get('Default'),
      })
      const titleMetrics = measureTextMetrics({
        bold: false,
        size: this.attributes.liSize,
        font: EnumFont.get('Default'),
      })

      const newMetricsBottom = convertPt2Px[this.attributes.liSize] * this.attributes.liLinespacing
      const newMetricsBaseline = (newMetricsBottom - titleMetrics.bottom) / 2 + titleMetrics.baseline
      titleMetrics.bottom = newMetricsBottom
      titleMetrics.baseline = newMetricsBaseline

      // 再对 frame 内容排版
      this.children[0].setFirstIndent(Math.max(10 + this.titleWidth - (this.attributes.liIndent > 1 ? 20 : 26), 0))
      const offsetX = 26 * this.attributes.liIndent
      const layoutMaxWidth = this.width - offsetX
      let currentFrame: LayoutFrame
      for (let i = 0, l = this.children.length; i < l; i++) {
        currentFrame = this.children[i]
        currentFrame.setMinMetrics({
          baseline: titleMetrics.baseline,
          bottom: titleMetrics.bottom,
        })
        currentFrame.setMaxWidth(layoutMaxWidth - 26)
        currentFrame.x = offsetX + 26
        currentFrame.layout()
        if (i < l - 1) {
          this.children[i + 1].y = Math.floor(currentFrame.y + currentFrame.height)
        }
        this.width = Math.max(this.width, currentFrame.x + currentFrame.width)
      }
      // 再比较 layoutFrame 中的行的 baseline 和 title 中的 baseline 及 line height，取较大值
      const newBaseline = Math.max(titleMetrics.baseline, this.children[0].lines[0].baseline)
      this.titleBaseline = newBaseline

      if (this.head !== null) {
        this.head.setPositionY(0, true, true)
      }
      this.needLayout = false
      const height = currentFrame!.y + currentFrame!.height
      this.setHeight(height)
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  /**
   * 渲染当前 listitem
   * @param viewHeight 整个画布的高度
   */
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    const offsetX = 26 * this.attributes.liIndent
    ctx.font = createTextFontString({
      italic: false,
      bold: false,
      size: this.attributes.liSize,
      font: EnumFont.get('Default'),
    })
    ctx.fillStyle = this.attributes.liColor
    ctx.fillText(this.titleContent, this.x + x + 6 + offsetX, this.y + y + this.titleBaseline)
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrame = this.children[i]
      currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight)
    }
    super.draw(ctx, x, y, viewHeight)
  }

  public setAttributes(attrs: any) {
    this.setOriginAttrs(attrs)
    this.compileAttributes()
  }

  public setTitleContent(titleContent: string) {
    this.titleContent = titleContent
  }

  public getDocumentPos(x: number, y: number, start: boolean): DocPos | null {
    x = x - this.x
    y = y - this.y
    for (let index = 0; index < this.children.length; index++) {
      const frame = this.children[index]
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.children.length - 1 && y > frame.y + frame.height)
      ) {
        const pos = frame.getDocumentPos(x - frame.x, y - frame.y, start)
        if (pos) {
          pos.index += frame.start
        }
        return pos
      }
    }
    return null
  }

  /**
   * 获取指定范围的矩形区域
   */
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    const rects: IRectangle[] = []
    let offset = start.index
    const length = end.index - offset
    const blockLength = offset < 0 ? length + offset : length
    offset = Math.max(0, offset)
    for (let frameIndex = 0; frameIndex < this.children.length; frameIndex++) {
      const frame = this.children[frameIndex]
      if (frame.start + frame.length <= offset) { continue }
      if (frame.start > offset + blockLength) { break }

      const frameOffset = offset - frame.start
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength
      const frameRects = frame.getSelectionRectangles(
        { index: Math.max(frameOffset, 0), inner: null },
        { index: Math.max(frameOffset, 0) + frameLength, inner: null }
      )
      for (let rectIndex = frameRects.length - 1; rectIndex >= 0; rectIndex--) {
        const rect = frameRects[rectIndex]
        rect.y += this.y
        // 如果 correctByPosY 不在当前 rect 的纵向范围内，就过滤这条结果
        if (typeof correctByPosY === 'number' && (correctByPosY < rect.y || correctByPosY > rect.y + rect.height)) {
          frameRects.splice(rectIndex, 1)
          continue
        }
        rect.x += this.x
      }
      rects.push(...frameRects)
    }

    return rects
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, index: number, length: number) {
    const currentIndent = this.attributes.liIndent
    const step = increase ? 1 : -1
    let newIndent = currentIndent + step
    newIndent = Math.min(newIndent, 8)
    newIndent = Math.max(newIndent, 0)

    if (currentIndent !== newIndent) {
      this.setAttributes({
        indent: newIndent,
      })
      // 当前 listitem 的 indent 发生变化时，所有相同 listId 的 listitem 都需要重新排版，因为序号可能会发生变化
      if (this.parent !== null) {
        for (let i = 0; i < this.parent.children.length; i++) {
          const element = this.parent.children[i]
          if (element instanceof ListItem && element.attributes.listId === this.attributes.listId) {
            element.needLayout = true
          }
        }
      }
    }
  }

  public toOp(): Op[] {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      const layoutOps = element.toOp()
      Object.assign(
        layoutOps[layoutOps.length - 1].attributes,
        this.getOriginAttrs()
      )
      res.push(...layoutOps)
    }
    this.setBlockOpAttribute(res, ListItem.blockType)
    return res
  }

  public toHtml(selection?: IRange): string {
    return super.childrenToHtml(selection)
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(index: number): ListItem {
    this.needLayout = true
    const newFrames = super.splitByEnter(index)
    const newList = new ListItem()
    newList.setHeight(this.width)
    newList.addAll(newFrames)
    newList.setAttributes(this.getOriginAttrs())
    return newList
  }

  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const res = super.getFormat(index, length)
    collectAttributes(this.attributes, res)
    return res
  }

  protected formatSelf(attr: IFormatAttributes, index: number, length: number): void {
    if (index === 0 && (length === this.length || length === this.length - 1)) {
      this.setAttributes(attr)
    }
  }

  protected clearSelfFormat(index?: number | undefined, length?: number | undefined): void {
    const { liColor: color, liSize: size, liLinespacing: linespacing } = ListItemDefaultAttributes
    this.setAttributes({ color, size, linespacing })
  }

  private setTitleIndex() {
    let index = 0
    let parentTitle = ''

    let findIndex = false
    let findParentTitle = this.attributes.listType !== EnumListType.ol3

    let currentListItem = this.prevSibling
    while (currentListItem !== null) {
      if (
        currentListItem instanceof ListItem &&
        currentListItem.attributes.listId === this.attributes.listId
      ) {
        const levelOffset = this.attributes.liIndent - currentListItem.attributes.liIndent

        if (levelOffset === 0) {
          findIndex = true
          findParentTitle = true
          index = currentListItem.titleIndex + 1
          parentTitle = currentListItem.titleParent
        } else if (levelOffset > 0) {
          parentTitle = currentListItem.titleContent
          for (let i = 1; i < levelOffset; i++) {
            parentTitle += '1.'
          }
          findParentTitle = true
          findIndex = true
        } else if (levelOffset < 0) {
          index = 1
        }
      }

      if (findIndex && findParentTitle) {
        break
      } else {
        currentListItem = currentListItem.prevSibling
      }
    }
    this.titleIndex = index
    this.titleParent = parentTitle
  }

  /**
   * 设置原始 attributes
   * @param attrs attributes
   */
  private setOriginAttrs(attrs: any) {
    this.originAttrs.listId = attrs['list-id']
    if (attrs.hasOwnProperty('color') && attrs.color !== this.defaultAttrs.liColor) {
      this.originAttrs.liColor = attrs.color
    } else {
      delete this.originAttrs.liColor
    }
    if (attrs.hasOwnProperty('size') && attrs.size !== this.defaultAttrs.liSize) {
      this.originAttrs.liSize = attrs.size
    } else {
      delete this.originAttrs.liSize
    }
    if (attrs.hasOwnProperty('linespacing') && attrs.linespacing !== this.defaultAttrs.liLinespacing) {
      this.originAttrs.liLinespacing = attrs.linespacing
    } else {
      delete this.originAttrs.liLinespacing
    }
    if (attrs.hasOwnProperty('indent') && attrs.indent !== this.defaultAttrs.liIndent) {
      this.originAttrs.liIndent = attrs.indent
    } else {
      delete this.originAttrs.liIndent
    }
    const listType = attrs['list-type']
    if (typeof listType === 'string') {
      this.attributes.listType = calListTypeFromChangeData(listType)
    } else {
      delete this.originAttrs.listType
    }

    this.children.forEach((frame) => {
      frame.setAttributes({
        linespacing: this.attributes.liLinespacing,
      })
    })
  }

  private getOriginAttrs(): any {
    let listTypeData: any
    switch (this.attributes.listType) {
      case EnumListType.ol1:
        listTypeData = { 'list-type': 'decimal', 'list-id': this.attributes.listId }
        break
      case EnumListType.ol2:
        listTypeData = { 'list-type': 'ckj-decimal', 'list-id': this.attributes.listId }
        break
      case EnumListType.ol3:
        listTypeData = { 'list-type': 'upper-decimal', 'list-id': this.attributes.listId }
        break
      case EnumListType.ul1:
        listTypeData = { 'list-type': 'circle', 'list-id': this.attributes.listId }
        break
      case EnumListType.ul2:
        listTypeData = { 'list-type': 'ring', 'list-id': this.attributes.listId }
        break
      case EnumListType.ul3:
        listTypeData = { 'list-type': 'arrow', 'list-id': this.attributes.listId }
        break
    }
    return {
      color: this.attributes.liColor,
      size: this.attributes.liSize,
      indent: this.attributes.liIndent,
      linespacing: this.attributes.liLinespacing,
      ...listTypeData,
    }
  }

  /**
   * 编译计算最终的 attributes
   */
  private compileAttributes() {
    this.attributes = { ...this.defaultAttrs, ...this.originAttrs }
  }
}
