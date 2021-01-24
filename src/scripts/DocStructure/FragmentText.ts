import isEqual from 'lodash/isEqual'
import Op from 'quill-delta-enhanced/dist/Op'
import IRangeNew from '../Common/IRangeNew'
import { EnumFont } from './EnumTextStyle'
import { IFormatAttributes } from './FormatAttributes'
import Fragment from './Fragment'
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from './FragmentTextAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import { DocPos } from '../Common/DocPos'

import { getPlatform } from '../Platform'
import { convertFragmentAttributesToCssStyleText } from '../Common/util'

export default class FragmentText extends Fragment {
  public static readonly fragType: string = ''
  public content = '';

  public defaultAttributes: IFragmentTextAttributes = FragmentTextDefaultAttributes
  public attributes: IFragmentTextAttributes = { ...FragmentTextDefaultAttributes }

  public readFromOps(Op: Op): void {
    const attr = Op.attributes
    if (attr !== undefined) {
      if (attr.font && attr.hasOwnProperty('font')) {
        attr.font = EnumFont.getFontValue(attr.font)
      }
      this.setAttributes(attr)
    }
    this.calMetrics()
    this.content = Op.insert as any
  }

  get length(): number {
    return this.content.length
  }

  public calTotalWidth(): number {
    return getPlatform().measureTextWidth(this.content, this.attributes)
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics() {
    this.metrics = getPlatform().measureTextMetrics(this.attributes)
  }

  public toOp(): Op {
    const fontOpValue = this.originalAttributes?.font ? { font: EnumFont.getFontName(this.originalAttributes.font) } : null
    const res: Op = {
      insert: this.content,
    }
    if (fontOpValue !== null || (this.originalAttributes && Object.keys(this.originalAttributes).length > 0)) {
      res.attributes = { ...this.originalAttributes, ...fontOpValue }
    }
    return res
  }

  public toHtml(selection?: IRangeNew): string {
    const textContent = selection ? this.content.substring(selection.start.index, selection.end.index) : this.content
    if (this.attributes.link) {
      return `<a href=${this.attributes.link} style=${convertFragmentAttributesToCssStyleText(this.attributes)}>${textContent}</a>`
    } else {
      return `<span style=${convertFragmentAttributesToCssStyleText(this.attributes)}>${textContent}</span>`
    }
  }

  public toText(selection?: IRangeNew): string {
    if (selection) {
      return this.content.substring(selection.start.index, selection.end.index)
    } else {
      return this.content
    }
  }

  /**
   * 在指定位置插入内容
   */
  public insertText(content: string, pos: DocPos, attr?: Partial<IFragmentTextAttributes>): boolean {
    if (content.length === 0) return false
    if (attr) {
      let isAttrEqual = true
      const keys = Object.keys(attr)
      for (let i = 0; i < keys.length; i++) {
        if (!isEqual(attr[keys[i]], this.attributes[keys[i]])) {
          isAttrEqual = false
          break
        }
      }
      if (isAttrEqual) {
        this.content = this.content.slice(0, pos.index) + content + this.content.slice(pos.index)
        return true
      } else {
        if (this.parent) {
          const parent = this.parent
          const newContentA = this.content.slice(0, pos.index)
          const newContentB = this.content.slice(pos.index)
          if (newContentA) {
            this.setContent(newContentA)
          }
          const newFrag = new FragmentText()
          newFrag.setContent(content)
          newFrag.setAttributes(attr)
          newFrag.calMetrics()
          parent.addAfter(newFrag, this)
          if (!newContentA) {
            parent.remove(this)
          }
          if (newContentB) {
            const newFragB = new FragmentText()
            newFragB.setContent(newContentB)
            newFragB.setAttributes(this.attributes)
            newFragB.calMetrics()
            parent.addAfter(newFragB, newFrag)
          }
          return true
        } else {
          return false
        }
      }
    } else {
      this.content = this.content.slice(0, pos.index) + content + this.content.slice(pos.index)
      return true
    }
  }

  public insertEnter(pos: DocPos): FragmentText | null {
    const newFrag = new FragmentText()
    newFrag.setContent(this.content.slice(pos.index))
    newFrag.setAttributes(this.originalAttributes)
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
  public format(attr: IFormatAttributes, range?: IRangeNew) {
    if (
      !range ||
      (range.start.index <= 0 && range.end.index >= this.length)
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
        newFrag.setAttributes({ ...this.originalAttributes })
        newFrag.calMetrics()

        this.setAttributes(attr)
        this.content = bContent
        this.calMetrics()

        this.parent!.addAfter(newFrag, this)
      } else if (!cContent) {
        // 说明肯定有 a、b 两段
        const newFrag = new FragmentText()
        newFrag.content = bContent
        newFrag.setAttributes({ ...this.originalAttributes, ...attr })
        newFrag.calMetrics()

        this.content = aContent
        this.calMetrics()

        this.parent!.addAfter(newFrag, this)
      } else {
        // 说明 3 段都有
        const newFragB = new FragmentText()
        newFragB.content = bContent
        newFragB.setAttributes({ ...this.originalAttributes, ...attr })
        newFragB.calMetrics()
        const newFragC = new FragmentText()
        newFragC.content = cContent
        newFragC.setAttributes({ ...this.originalAttributes })
        newFragC.calMetrics()

        this.content = aContent
        this.parent!.addAfter(newFragB, this)
        this.parent!.addAfter(newFragC, newFragB)
      }
    }
  }

  public clearFormat(range?: IRangeNew) {
    const defaultAttributes: Partial<IFragmentTextAttributes> = { ...FragmentTextDefaultAttributes }
    delete defaultAttributes.link
    delete defaultAttributes.composing
    this.format(defaultAttributes, range)
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
    if (frag instanceof FragmentText && isEqual(this.originalAttributes, frag.originalAttributes)) {
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

  public compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }
}
