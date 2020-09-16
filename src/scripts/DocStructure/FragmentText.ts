
import isEqual from 'lodash/isEqual'
import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import IRange from '../Common/IRange'
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform'
import { findKeyByValueInMap } from '../Common/util'
import { EnumFont } from './EnumTextStyle'
import { IFormatAttributes } from './FormatAttributes'
import Fragment from './Fragment'
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from './FragmentTextAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import { DocPos } from '../Common/DocPos'
import IRangeNew from '../Common/IRangeNew'

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
        const font = EnumFont.get((attr as any).font)
        if (typeof font === 'string') {
          this.attributes.font = font
        }
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

  public toText(selection?: IRange): string {
    if (selection) {
      return this.content.substr(selection.index, selection.length)
    } else {
      return this.content
    }
  }

  /**
   * 在指定位置插入内容
   */
  public insertText(content: string, pos: DocPos):boolean {
    this.content = this.content.slice(0, pos.index) + content + this.content.slice(pos.index)
    return true
  }

  public insertEnter(pos: DocPos): FragmentText | null {
    const newFrag = new FragmentText()
    newFrag.setContent(this.content.slice(pos.index))
    newFrag.setAttributes(this.originAttrs)
    newFrag.calMetrics()

    this.content = this.content.slice(0, pos.index)

    return newFrag
  }

  /**
   * 删除指定范围的内容（length 为空时删除 index 后所有内容）
   */
  public delete(start: DocPos, end: DocPos) {
    const prev = this.content.substr(0, start.index)
    const next = this.content.substr(end.index)
    this.content = prev + next
    super.delete(start, end)
  }

  /**
   * 设置文本格式
   */
  public format(attr: IFormatAttributes, range?: IRangeNew): FragmentText[] {
    if (
      !range ||
      (range.start.index <= this.start && range.end.index >= this.start + this.length)
    ) {
      this.setAttributes(attr)
      return []
    } else {
      // 最复杂的时候会把当前这个 fragment text 切分为 3 段，起码也会被切成两段
      // 这里要分三种情况来处理，1、有 3 段；2、没有第一段；3、没有最后一段
      const aContent = this.content.substring(0, range.start.index)
      const bContent = this.content.substring(range.start.index, range.end.index)
      const cContent = this.content.substring(range.end.index)

      if (!aContent) {
        // 说明肯定有 b、c 两段
        const newFrag = new FragmentText()
        newFrag.content = cContent
        newFrag.setAttributes(this.originAttrs)

        this.setAttributes(attr)
        this.content = bContent
        this.calMetrics()

        return [newFrag]
      } else if (!cContent) {
        // 说明肯定有 a、b 两段
        const newFrag = new FragmentText()
        newFrag.content = bContent
        newFrag.setAttributes(this.originAttrs)
        newFrag.calMetrics()

        this.setAttributes(attr)
        this.content = aContent
        this.calMetrics()

        return [newFrag]
      } else {
        // 说明 3 段都有
        const newFragB = new FragmentText()
        newFragB.content = bContent
        newFragB.setAttributes(attr)
        newFragB.calMetrics()
        const newFragC = new FragmentText()
        newFragC.content = cContent
        newFragC.setAttributes(this.originAttrs)
        newFragC.calMetrics()

        this.content = aContent
        return [newFragB, newFragC]
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

  public eat(frag: FragmentText): boolean {
    if (isEqual(this.originAttrs, frag.originAttrs)) {
      this.setContent(this.content + frag.content)
      return true
    } else {
      return false
    }
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
