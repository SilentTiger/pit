import Op from 'quill-delta-enhanced/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import IRange from '../Common/IRange'
import BlockCommon from './BlockCommon'
import { DocPos } from '../Common/DocPos'
import ILayoutFrameAttributes from './LayoutFrameAttributes'
import { findChildInDocPos } from '../Common/util'
import IParagraphAttributes, { ParagraphDefaultAttributes } from './ParagraphAttributes'
import { EnumTitle } from './EnumTextStyle'
import { IAttributes } from '../Common/IAttributable'
import LayoutFrame from './LayoutFrame'

export default class Paragraph extends BlockCommon {
  public static readonly blockType: string = 'para'
  public defaultAttributes :IParagraphAttributes = ParagraphDefaultAttributes
  public attributes: IParagraphAttributes = { ...ParagraphDefaultAttributes }

  public readFromOps(Ops: Op[]): void {
    this.setAttributes(Ops[Ops.length - 1].attributes)
    const frames = super.readOpsToLayoutFrame(Ops)
    this.add(frames[0])
    this.length = frames[0].length
  }

  /**
   * 对当前段落排版
   */
  public layout() {
    if (this.needLayout && this.head) {
      this.head.layout()

      this.head.x = 0
      this.head.y = 0
      this.head.start = 0
      this.needLayout = false

      this.setHeight(this.head.height)
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(this.y + this.height)
      }
    }
  }

  /**
   * 获取指定 x y 坐标所指向的文档位置
   */
  public getDocumentPos(x: number, y: number, start: boolean): DocPos | null {
    return this.head!.getDocumentPos(x - this.x, y - this.y, start)
  }

  /**
   * 计算指定范围在当前段落的矩形区域
   */
  public getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[] {
    const offset = start.index
    const length = end.index - offset
    const blockLength = offset < 0 ? length + offset : length
    const rects = this.head!.getSelectionRectangles(
      { index: Math.max(offset, 0), inner: null },
      { index: Math.max(offset, 0) + blockLength, inner: null }
    )
    for (let rectIndex = rects.length - 1; rectIndex >= 0; rectIndex--) {
      const rect = rects[rectIndex]
      rect.y += this.y
      // 如果 correctByPosY 不在当前 rect 的纵向范围内，就过滤这条结果
      if (typeof correctByPosY === 'number' && (correctByPosY < rect.y || correctByPosY > rect.y + rect.height)) {
        rects.splice(rectIndex, 1)
        continue
      }
      rect.x += this.x
    }
    return rects
  }

  /**
   * 删除指定范围的内容
   */
  public delete(start: DocPos, end: DocPos, forward: boolean): void {
    start.index -= this.start
    end.index -= this.start
    this.head!.delete(start, end, forward)
    this.length = this.head!.length
    this.needLayout = true
  }

  public toOp(withKey: boolean): Op[] {
    const ops = this.head!.toOp(withKey)
    this.setBlockOpAttribute(ops, Paragraph.blockType)
    return ops
  }
  public toHtml(selection?: IRange): string {
    return `<p>${super.childrenToHtml(selection)}</p>`
  }

  /**
   * 在指定位置插入一个换行符
   */
  public insertEnter(pos: DocPos, attr?: Partial<ILayoutFrameAttributes>): Paragraph | null {
    const frame = findChildInDocPos(pos.index, this.children, true)
    if (!frame) return null
    const layoutframe = frame.insertEnter({ index: pos.index - frame.start, inner: pos.inner }, attr)
    this.needLayout = true
    if (layoutframe) {
      const newParagraph = new Paragraph()
      newParagraph.setWidth(this.width)
      newParagraph.add(layoutframe)
      this.calLength()
      return newParagraph
    }
    this.calLength()
    return null
  }

  /**
   * 渲染当前段落
   * @param viewHeight 整个画布的高度
   */
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    this.head!.draw(ctx, this.x + x, this.y + y, viewHeight)
    super.draw(ctx, x, y, viewHeight)
  }

  public setAttributes(attr: IAttributes | null | undefined) {
    super.setAttributes(attr)
    if (this.head) {
      this.setFrameOverrideAttributes(this.head)
      this.setFrameOverrideDefaultAttributes(this.head)
    }
  }

  afterAdd(node: LayoutFrame): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  afterAddAfter(node: LayoutFrame, target: LayoutFrame): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  afterAddBefore(node: LayoutFrame, target: LayoutFrame): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  afterAddAtIndex(node: LayoutFrame, index: number): void {
    this.setFrameOverrideAttributes(node)
    this.setFrameOverrideDefaultAttributes(node)
  }
  afterAddAll(nodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      this.setFrameOverrideAttributes(node)
      this.setFrameOverrideDefaultAttributes(node)
    })
  }
  afterRemoveAll(nodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
  }
  afterRemove(node: LayoutFrame): void {
    this.removeFrameOverrideAttributes(node)
    this.removeFrameOverrideDefaultAttributes(node)
  }
  afterRemoveAllFrom(nodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
  }
  afterSplice(start: number, deleteCount: number, nodes: LayoutFrame[], removedNodes: LayoutFrame[]): void {
    nodes.forEach(node => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
    removedNodes.forEach(node => {
      this.removeFrameOverrideAttributes(node)
      this.removeFrameOverrideDefaultAttributes(node)
    })
  }

  private setFrameOverrideAttributes(frame: LayoutFrame) {
    const overrideAttributes = this.getOverrideAttributes()
    if (Object.keys(overrideAttributes).length > 0) {
      frame.setOverrideAttributes(overrideAttributes)
    }
  }

  private removeFrameOverrideAttributes(frame: LayoutFrame) {
    const emptyAttr = this.getOverrideAttributes()
    Object.keys(emptyAttr).forEach(key => {
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
        attr.linespacing = 2
        break
      case EnumTitle.Subtitle:
        attr.bold = true
        attr.size = 18
        attr.linespacing = 2
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
