import type Op from 'quill-delta-enhanced/dist/Op'
import type { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { convertFragmentAttributesToCssStyleText } from '../Common/util'
import { getPlatform } from '../Platform'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import type IFragmentDateAttributes from './FragmentDateAttributes';
import { FragmentDateDefaultAttributes } from './FragmentDateAttributes'

export default class FragmentDate extends Fragment {
  public static readonly fragType: string = 'date'
  public metrics!: IFragmentMetrics
  public stringContent = ''

  public defaultAttributes: IFragmentDateAttributes = FragmentDateDefaultAttributes
  public originalAttributes: Partial<IFragmentDateAttributes> | null = null
  public attributes: IFragmentDateAttributes = { ...FragmentDateDefaultAttributes }

  public readFromOps(Op: Op): void {
    // 能进这里 attributes 肯定不会是 undefined
    const attr = Op.attributes!
    if (attr.font && attr.hasOwnProperty('font')) {
      attr.font = EnumFont.getFontValue(attr.font)
    }
    this.setAttributes(attr)
    this.stringContent = this.originalAttributes?.date
      ? `⏰${  new Date(this.originalAttributes.date).toDateString()}`
      : ''
    this.calMetrics()
  }

  public calTotalWidth(): number {
    return getPlatform().measureTextWidth(this.stringContent, this.attributes)
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics() {
    this.metrics = getPlatform().measureTextMetrics(this.attributes)
  }

  public toOp(withKey: boolean): Op {
    const fontOpValue = this.originalAttributes?.font
      ? { font: EnumFont.getFontName(this.originalAttributes.font) }
      : null
    const op: Op = {
      insert: 1,
      attributes: { ...this.originalAttributes, frag: FragmentDate.fragType, ...fontOpValue },
    }
    if (withKey) {
      op.key = this.id
    }
    return op
  }

  public toHtml(): string {
    return `<span style=${convertFragmentAttributesToCssStyleText(this.attributes)}>${this.stringContent}</span>`
  }

  public toText(): string {
    return this.stringContent
  }

  public clearFormat() {
    const defaultAttributes: Partial<IFragmentDateAttributes> = { ...FragmentDateDefaultAttributes }
    delete defaultAttributes.id
    delete defaultAttributes.date
    delete defaultAttributes.type
    this.setAttributes(defaultAttributes)
  }

  public compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }
}
