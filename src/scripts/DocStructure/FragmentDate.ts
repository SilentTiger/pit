
import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { convertFragmentAttributesToCssStyleText } from '../Common/util'
import { getPlatform } from '../Platform'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import IFragmentDateAttributes, { FragmentDateDefaultAttributes } from './FragmentDateAttributes'

export default class FragmentDate extends Fragment {
  public static readonly fragType: string = 'date'
  public metrics!: IFragmentMetrics;
  public stringContent: string = '';

  public defaultAttributes: IFragmentDateAttributes = FragmentDateDefaultAttributes
  public originalAttributes: Partial<IFragmentDateAttributes> = {}
  public attributes: IFragmentDateAttributes = { ...FragmentDateDefaultAttributes }

  public readFromOps(Op: Op): void {
    // 能进这里 attributes 肯定不会是 undefined
    const attr = Op.attributes!
    if (attr.font && attr.hasOwnProperty('font')) {
      attr.font = EnumFont.getFontValue(attr.font)
    }
    this.setAttributes(attr)
    this.stringContent = this.originalAttributes.date ? '⏰' + new Date(this.originalAttributes.date).toDateString() : ''
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

  public toOp(): Op {
    const fontOpValue = this.originalAttributes.font ? { font: EnumFont.getFontName(this.originalAttributes.font) } : null
    return {
      insert: 1,
      attributes: { ...this.originalAttributes, frag: FragmentDate.fragType, ...fontOpValue },
    }
  }

  public toHtml(): string {
    return `<span style=${convertFragmentAttributesToCssStyleText(this.attributes)}>${this.stringContent}</span>`
  }

  public toText(): string {
    return this.stringContent
  }

  public compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }
}
