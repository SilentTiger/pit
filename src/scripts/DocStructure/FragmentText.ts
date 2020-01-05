
import Op from 'quill-delta/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import IRange from '../Common/IRange'
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform'
import { findKeyByValueInMap } from '../Common/util'
import { EnumFont } from './EnumTextStyle'
import { IFormatAttributes } from './FormatAttributes'
import Fragment from './Fragment'
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from './FragmentTextAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'

export default class FragmentText extends Fragment {
  public static readonly fragType: string = ''
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentTextAttributes = FragmentTextDefaultAttributes;
  public content: string = '';

  protected defaultAttrs = FragmentTextDefaultAttributes;
  protected originAttrs: Partial<IFragmentTextAttributes> = {};

  public readFromOps(Op: Op): void {
    const attr = Op.attributes
    if (attr !== undefined) {
      this.setAttributes(attr)
      if (attr.font) {
        this.attributes.font = EnumFont.get((attr as any).font)
      }
    }
    this.content = Op.insert as any
    this.calMetrics()
  }

  get length(): number {
    return this.content.length
  }

  public calSize(): { width: number; height: number } {
    return {
      height: convertPt2Px[this.attributes.size],
      width: measureTextWidth(this.content, this.attributes),
    }
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics() {
    this.metrics = measureTextMetrics(this.attributes)
  }

  public toOp(): Op {
    return {
      insert: this.content,
      attributes: { ...this.originAttrs },
    }
  }

  public toHtml(selection?: IRange): string {
    if (selection) {
      return `<span>${this.content.substr(selection.index, selection.length)}</span>`
    } else {
      return `<span>${this.content}</span>`
    }
  }

  /**
   * 在指定位置插入内容
   */
  public insert(content: string, index: number) {
    this.content = this.content.slice(0, index) + content + this.content.slice(index)
  }

  /**
   * 删除指定范围的内容（length 为空时删除 index 后所有内容）
   */
  public delete(index: number, length?: number) {
    const prev = this.content.substr(0, index)
    const next = length === undefined ? '' : this.content.substr(index + length)
    this.content = prev + next
    super.delete(index, length)
  }

  /**
   * 设置文本格式
   */
  public format(attr: IFormatAttributes, range?: IRange): void {
    if (!range || (range.index === 0 && range.length === this.length)) {
      this.setAttributes(attr)
    } else {
      const newContentString = this.content.substr(range.index, range.length)
      const newContentAttrs = { ...this.originAttrs, ...attr }
      const newContentFrag = new FragmentText()
      newContentFrag.setAttributes(newContentAttrs)
      newContentFrag.setContent(newContentString)
      newContentFrag.calMetrics()
      if (range.index === 0) {
        this.content = this.content.substr(range.length)
        this.parent!.addBefore(newContentFrag, this)
      } else if (range.index + range.length === this.length) {
        this.content = this.content.substr(0, range.index)
        this.parent!.addAfter(newContentFrag, this)
      } else {
        const headContent = this.content.substr(0, range.index)
        this.content = this.content.substr(range.index + range.length)
        this.parent!.addBefore(newContentFrag, this)
        const newContentFragBefore = new FragmentText()
        newContentFragBefore.setAttributes(this.originAttrs)
        newContentFragBefore.setContent(headContent)
        newContentFragBefore.calMetrics()
        this.parent!.addBefore(newContentFragBefore, newContentFrag)
      }
    }
  }

  /**
   * 获取当前 fragment 的属性
   */
  public getFormat() {
    const attrs: IFragmentTextAttributes = { ...this.attributes }
    const findKeyRes = findKeyByValueInMap(EnumFont, attrs.font)
    if (findKeyRes.find) {
      attrs.font = findKeyRes.key[0]
    }
    return attrs
  }

  /**
   * 重新设置当前 fragment text 的内容
   * @param content 新内容
   */
  public setContent(content: string) {
    this.content = content
    this.calMetrics()
  }

  public onPointerEnter() {
    super.onPointerEnter()
  }

  public onPointerLeave() {
    super.onPointerLeave()
  }

  public onPointerTap() {
    super.onPointerTap()
    if (this.attributes.link) {
      this.bubbleUp(BubbleMessage.OPEN_LINK, this.attributes.link)
    }
  }

  /**
   * 编译计算渲染所用的属性
   */
  protected compileAttributes() {
    this.attributes = {
      ...this.defaultAttrs,
      ...this.originAttrs,
    }
    if (this.originAttrs.font && EnumFont.get(this.originAttrs.font)) {
      Object.assign(this.attributes, { font: EnumFont.get(this.originAttrs.font) })
    }
  }
}
