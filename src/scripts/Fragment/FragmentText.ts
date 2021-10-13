import isEqual from 'lodash/isEqual'
import type Op from 'quill-delta-enhanced/dist/Op'
import type IRange from '../Common/IRange'
import { EnumFont } from '../Common/EnumTextStyle'
import Fragment from './Fragment'
import type IFragmentTextAttributes from '../Fragment/FragmentTextAttributes'
import { FragmentTextDefaultAttributes } from '../Fragment/FragmentTextAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import type { DocPos } from '../Common/DocPos'
import { compareDocPos } from '../Common/DocPos'

import { getPlatform } from '../Platform'
import { convertFragmentAttributesToCssStyleText } from '../Common/util'

export default class FragmentText extends Fragment {
  public static override readonly typeName: string = ''
  override get typeName(): string {
    return FragmentText.typeName
  }

  public content = ''

  public override defaultAttributes: IFragmentTextAttributes = FragmentTextDefaultAttributes
  public override attributes: IFragmentTextAttributes = { ...FragmentTextDefaultAttributes }

  public override readFromOps(Op: Op): void {
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

  override get length(): number {
    return this.content.length
  }

  public override calTotalWidth(): number {
    return getPlatform().measureTextWidth(this.content, this.attributes)
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public override calMetrics() {
    this.metrics = getPlatform().measureTextMetrics(this.attributes)
  }

  public override toOp(): Op {
    const fontOpValue = this.originalAttributes?.font
      ? { font: EnumFont.getFontName(this.originalAttributes.font) }
      : null
    const res: Op = {
      insert: this.content,
    }
    if (fontOpValue !== null || (this.originalAttributes && Object.keys(this.originalAttributes).length > 0)) {
      res.attributes = { ...this.originalAttributes, ...fontOpValue }
    }
    return res
  }

  public override toHtml(selection?: IRange): string {
    const textContent = selection ? this.content.substring(selection.start.index, selection.end.index) : this.content
    if (this.attributes.link) {
      return `<a href=${this.attributes.link} style=${convertFragmentAttributesToCssStyleText(
        this.attributes,
      )}>${textContent}</a>`
    } else {
      return `<span style=${convertFragmentAttributesToCssStyleText(this.attributes)}>${textContent}</span>`
    }
  }

  public override toText(selection?: IRange): string {
    if (selection) {
      return this.content.substring(selection.start.index, selection.end.index)
    } else {
      return this.content
    }
  }

  /**
   * 在指定位置插入内容
   */
  public override insertText(content: string, pos: DocPos, attr?: Partial<IFragmentTextAttributes>): FragmentText[] {
    if (content.length === 0) {
      return []
    }
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
        return [this]
      } else {
        const res: FragmentText[] = []
        const newContentA = this.content.slice(0, pos.index)
        const newContentB = this.content.slice(pos.index)
        if (newContentA) {
          this.setContent(newContentA)
          res.push(this)
        }
        const SelfConstructor = this.constructor as typeof FragmentText
        const newFrag = new SelfConstructor()
        newFrag.setContent(content)
        newFrag.setAttributes(attr)
        newFrag.calMetrics()
        res.push(newFrag)

        if (newContentB) {
          const newFragB = new SelfConstructor()
          newFragB.setContent(newContentB)
          newFragB.setAttributes(this.attributes)
          newFragB.calMetrics()
          res.push(newFragB)
        }
        return res
      }
    } else {
      this.content = this.content.slice(0, pos.index) + content + this.content.slice(pos.index)
      return [this]
    }
  }

  public override insertEnter(pos: DocPos): FragmentText | null {
    const newFrag = new (this.constructor as typeof FragmentText)()
    newFrag.setContent(this.content.slice(pos.index))
    newFrag.setAttributes(this.originalAttributes)
    newFrag.calMetrics()

    this.content = this.content.slice(0, pos.index)

    return newFrag
  }

  public override insertFragment(frag: Fragment, pos: DocPos): Fragment[] {
    // 这里只有一种情况就是插入当前 fragment text 的中间某个位置，把当前的 fragment text 分割成两段
    const newFrag = new (this.constructor as typeof FragmentText)()
    newFrag.setContent(this.content.slice(pos.index))
    newFrag.setAttributes(this.originalAttributes)
    newFrag.calMetrics()

    this.content = this.content.slice(0, pos.index)

    return [this, frag, newFrag]
  }

  /**
   * 删除指定范围的内容（length 为空时删除 index 后所有内容）
   */
  public override delete(range: IRange, forward?: boolean) {
    const { start, end } = range
    let prev = ''
    let next = ''
    if (compareDocPos(range.start, range.end) === 0) {
      if (forward) {
        prev = this.content.substr(0, start.index - 1)
        next = this.content.substr(end.index)
      } else {
        prev = this.content.substr(0, start.index)
        next = this.content.substr(end.index + 1)
      }
    } else {
      prev = this.content.substr(0, start.index)
      next = this.content.substr(end.index)
    }
    this.content = prev + next
    super.delete(range)
  }

  /**
   * 设置文本格式
   */
  public override format(attr: Partial<IFragmentTextAttributes>, range?: IRange): FragmentText[] {
    if (!range || (range.start.index <= 0 && range.end.index >= this.length)) {
      this.setAttributes(attr)
      return [this]
    } else {
      // 最复杂的时候会把当前这个 fragment text 切分为 3 段，起码也会被切成两段
      // 这里要分三种情况来处理，1、有 3 段；2、没有第一段；3、没有最后一段
      const aContent = this.content.substring(0, range.start.index)
      const bContent = this.content.substring(range.start.index, range.end.index)
      const cContent = this.content.substring(range.end.index)

      const res: FragmentText[] = []
      const SelfConstructor = this.constructor as typeof FragmentText
      if (!aContent) {
        // 说明肯定有 b、c 两段
        const newFrag = new SelfConstructor()
        newFrag.content = cContent
        newFrag.setAttributes({ ...this.originalAttributes })
        newFrag.calMetrics()

        this.setAttributes(attr)
        this.content = bContent
        this.calMetrics()

        res.push(this, newFrag)
      } else if (!cContent) {
        // 说明肯定有 a、b 两段
        const newFrag = new SelfConstructor()
        newFrag.content = bContent
        newFrag.setAttributes({ ...this.originalAttributes, ...attr })
        newFrag.calMetrics()

        this.content = aContent
        this.calMetrics()

        res.push(this, newFrag)
      } else {
        // 说明 3 段都有
        const newFragB = new SelfConstructor()
        newFragB.content = bContent
        newFragB.setAttributes({ ...this.originalAttributes, ...attr })
        newFragB.calMetrics()
        const newFragC = new SelfConstructor()
        newFragC.content = cContent
        newFragC.setAttributes({ ...this.originalAttributes })
        newFragC.calMetrics()

        this.content = aContent
        res.push(this, newFragB, newFragC)
      }
      return res
    }
  }

  public override clearFormat(range?: IRange) {
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

  public override eat(frag: FragmentText): boolean {
    if (frag instanceof FragmentText && isEqual(this.originalAttributes, frag.originalAttributes)) {
      this.setContent(this.content + frag.content)
      return true
    } else {
      return false
    }
  }

  public override onPointerEnter() {
    super.onPointerEnter()
  }

  public override onPointerLeave() {
    super.onPointerLeave()
  }

  public override onPointerTap() {
    super.onPointerTap()
    if (this.attributes.link) {
      this.bubbleUp(BubbleMessage.OPEN_LINK, this.attributes.link)
    }
  }

  public override compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }
}
