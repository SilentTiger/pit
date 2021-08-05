import type Op from 'quill-delta-enhanced/dist/Op'
import type ICanvasContext from '../Common/ICanvasContext'
import { calListItemTitle, calListTypeFromChangeData, findChildInDocPos } from '../Common/util'
import { EnumListType } from './EnumListStyle'
import { EnumFont, EnumTitle } from './EnumTextStyle'
import type { IFormatAttributes } from './FormatAttributes'
import type LayoutFrame from './LayoutFrame'
import type IListItemAttributes from './ListItemAttributes';
import { ListItemDefaultAttributes } from './ListItemAttributes'
import type IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import type { DocPos } from '../Common/DocPos'
import type ILayoutFrameAttributes from './LayoutFrameAttributes'
import type IRangeNew from '../Common/IRangeNew'
import type { IAttributes } from '../Common/IAttributable'
import { getPlatform } from '../Platform'

export default class ListItem extends BlockCommon {
  public static readonly blockType: string = 'list'
  public defaultAttributes: IListItemAttributes = ListItemDefaultAttributes
  public attributes: IListItemAttributes = { ...ListItemDefaultAttributes }
  public overrideDefaultAttributes: Partial<IListItemAttributes> | null = null
  public originalAttributes: Partial<IListItemAttributes> | null = null
  public overrideAttributes: Partial<IListItemAttributes> | null = null
  public titleContent = ''
  public titleWidth = 0
  public titleBaseline = 0
  public titleIndex = 0
  public titleParent = ''

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
      this.setTitleContent(
        calListItemTitle(this.attributes.listType, this.attributes.liIndent, this.titleIndex, this.titleParent),
      )

      // 先对列表项 title 文字排版，算出宽度、行高、baseline 位置
      this.titleWidth = getPlatform().measureTextWidth(this.titleContent, {
        italic: false,
        bold: false,
        size: this.attributes.liSize,
        font: EnumFont.getFontValue('Default'),
      })
      const titleMetrics = getPlatform().measureTextMetrics({
        bold: false,
        size: this.attributes.liSize,
        font: EnumFont.getFontValue('Default'),
      })

      const newMetricsBottom = getPlatform().convertPt2Px[this.attributes.liSize] * this.attributes.liLinespacing
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
    ctx.font = getPlatform().createTextFontString({
      italic: false,
      bold: false,
      size: this.attributes.liSize,
      font: EnumFont.getFontValue('Default'),
    })
    ctx.fillStyle = this.attributes.liColor
    ctx.fillText(this.titleContent, this.x + x + 6 + offsetX, this.y + y + this.titleBaseline)
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrame = this.children[i]
      currentFrame.draw(ctx, this.x + x, this.y + y, viewHeight - currentFrame.y)
    }
    super.draw(ctx, x, y, viewHeight)
  }

  public setTitleContent(titleContent: string) {
    this.titleContent = titleContent
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean) {
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

  public toOp(withKey: boolean): Op[] {
    const res: Op[] = []
    for (let index = 0; index < this.children.length; index++) {
      const element = this.children[index]
      const layoutOps = element.toOp(withKey)
      Object.assign(layoutOps[layoutOps.length - 1].attributes, this.getOriginAttrs())
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
  public insertEnter(pos: DocPos, attr?: Partial<ILayoutFrameAttributes>): ListItem | null {
    const frame = findChildInDocPos(pos.index, this.children, true)
    if (!frame) {
      return null
    }
    const layoutframe = frame.insertEnter({ index: pos.index - frame.start, inner: pos.inner }, attr)
    this.calLength()
    this.needLayout = true
    if (layoutframe) {
      const newList = new ListItem()
      newList.setHeight(this.width)
      newList.add(layoutframe)
      newList.setAttributes(this.getOriginAttrs())
      return newList
    }
    return null
  }

  public setAttributes(attr: IAttributes | null | undefined) {
    if (attr) {
      const listType = attr['list-type']
      if (typeof listType === 'string') {
        attr.listType = calListTypeFromChangeData(listType)
      }
    }
    super.setAttributes(attr)

    this.children.forEach((frame) => {
      this.setFrameOverrideAttributes(frame)
      this.setFrameOverrideDefaultAttributes(frame)
    })
  }

  public afterAdd(node: LayoutFrame): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  public afterAddAfter(node: LayoutFrame, target: LayoutFrame): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  public afterAddBefore(node: LayoutFrame, target: LayoutFrame): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  public afterAddAtIndex(node: LayoutFrame, index: number): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  public afterAddAll(nodes: LayoutFrame[]): void {
    nodes.forEach((node) => {
      this.setFrameOverrideAttributes(node)
      this.setFrameOverrideDefaultAttributes(node)
    })
  }
  public afterRemoveAll(nodes: LayoutFrame[]): void {
    nodes.forEach((node) => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
  }
  public afterRemove(node: LayoutFrame): void {
    this.removeFrameOverrideAttributes(node)
    this.removeFrameOverrideDefaultAttributes(node)
  }
  public afterRemoveAllFrom(nodes: LayoutFrame[]): void {
    nodes.forEach((node) => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
  }
  public afterSplice(start: number, deleteCount: number, nodes: LayoutFrame[], removedNodes: LayoutFrame[]): void {
    nodes.forEach((node) => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
    removedNodes.forEach((node) => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
  }

  public format(attr: IFormatAttributes, range?: IRangeNew): void {
    super.format(attr, range)
    // 如果当前 listItem 的所有内容都被设置了某些格式，就还需要设置对应的 listItem 的格式
    if (
      !range ||
      (range.start.index === 0 &&
        range.start.inner === null &&
        range.end.index === this.start + this.length &&
        range.end.inner === null)
    ) {
      const newAttr: Partial<IListItemAttributes> = {}
      if (attr.hasOwnProperty('color')) {
        newAttr.liColor = attr.color
      }
      if (attr.hasOwnProperty('size')) {
        newAttr.liSize = attr.size
      }
      if (attr.hasOwnProperty('linespacing')) {
        newAttr.liLinespacing = attr.linespacing
      }
      if (attr.hasOwnProperty('indent')) {
        newAttr.liIndent = attr.indent
      }
      this.setAttributes(newAttr)
    }
  }

  protected formatSelf(attr: IFormatAttributes, range?: IRangeNew): void {
    this.setAttributes(attr)
  }

  protected clearSelfFormat(range?: IRangeNew): void {
    this.setAttributes({ ...ListItemDefaultAttributes })
  }

  private setTitleIndex() {
    let index = 0
    let parentTitle = ''

    let findIndex = false
    let findParentTitle = this.attributes.listType !== EnumListType.ol3

    let currentListItem = this.prevSibling
    while (currentListItem !== null) {
      if (currentListItem instanceof ListItem && currentListItem.attributes.listId === this.attributes.listId) {
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

  private getOriginAttrs(): any {
    let listTypeData: any
    switch (this.attributes.listType) {
      case EnumListType.ol1:
        listTypeData = { 'list-type': 'decimal', listId: this.attributes.listId }
        break
      case EnumListType.ol2:
        listTypeData = { 'list-type': 'ckj-decimal', listId: this.attributes.listId }
        break
      case EnumListType.ol3:
        listTypeData = { 'list-type': 'upper-decimal', listId: this.attributes.listId }
        break
      case EnumListType.ul1:
        listTypeData = { 'list-type': 'circle', listId: this.attributes.listId }
        break
      case EnumListType.ul2:
        listTypeData = { 'list-type': 'ring', listId: this.attributes.listId }
        break
      case EnumListType.ul3:
        listTypeData = { 'list-type': 'arrow', listId: this.attributes.listId }
        break
    }
    return {
      ...this.originalAttributes,
      ...listTypeData,
    }
  }

  private setFrameOverrideAttributes(frame: LayoutFrame) {
    const overrideAttributes = this.getOverrideAttributes()
    if (Object.keys(overrideAttributes).length > 0) {
      frame.setOverrideAttributes(overrideAttributes)
    }
  }

  private removeFrameOverrideAttributes(frame: LayoutFrame) {
    const emptyAttr = this.getOverrideAttributes()
    Object.keys(emptyAttr).forEach((key) => {
      emptyAttr[key] = undefined
    })
    frame.setOverrideAttributes(emptyAttr)
  }

  private getOverrideAttributes(): IAttributes {
    const attr: IAttributes = {}
    switch (this.attributes.title) {
      case EnumTitle.Title:
        attr.bold = true
        attr.size = 20
        break
      case EnumTitle.Subtitle:
        attr.bold = true
        attr.size = 18
        break
      case EnumTitle.H1:
        attr.bold = true
        attr.size = 16
        break
      case EnumTitle.H2:
        attr.bold = true
        attr.size = 14
        break
      case EnumTitle.H3:
        attr.bold = true
        attr.size = 13
        break
      case EnumTitle.H4:
        attr.bold = true
        attr.size = 12
        break
    }
    attr.linespacing = this.attributes.liLinespacing
    return attr
  }

  private setFrameOverrideDefaultAttributes(frame: LayoutFrame) {
    if (this.attributes.title === EnumTitle.Subtitle) {
      frame.setOverrideDefaultAttributes({ color: '#888' })
    }
  }

  private removeFrameOverrideDefaultAttributes(frame: LayoutFrame) {
    if (this.attributes.title === EnumTitle.Subtitle) {
      frame.setOverrideDefaultAttributes({ color: undefined })
    }
  }
}
