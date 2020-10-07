
import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import IFragmentDateAttributes, { FragmentDateDefaultAttributes } from './FragmentDateAttributes'

export default class FragmentDate extends Fragment {
  public static readonly fragType: string = 'date'
  public metrics!: IFragmentMetrics;
  public dateContent: { date: number; type: 'date' | 'date-time'; id: number } = {
    date: Date.now(),
    type: 'date',
    id: 0,
  };
  public stringContent: string = '';

  public defaultAttributes: IFragmentDateAttributes = FragmentDateDefaultAttributes
  public originalAttributes: Partial<IFragmentDateAttributes> = {}
  public attributes: IFragmentDateAttributes = { ...FragmentDateDefaultAttributes }

  public readFromOps(Op: Op): void {
    const attr = Op.attributes
    if (attr !== undefined) {
      if (attr.font && attr.hasOwnProperty('font')) {
        attr.font = EnumFont.getFontValue(attr.font)
      }
      this.setAttributes(attr)
    }
    this.dateContent = Op.insert as any
    this.stringContent = '⏰' + new Date(this.dateContent.date).toDateString()
    this.calMetrics()
  }

  public calSize(): { width: number; height: number } {
    return {
      height: convertPt2Px[this.attributes.size],
      width: measureTextWidth(this.stringContent, this.attributes),
    }
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics() {
    this.metrics = measureTextMetrics(this.attributes)
  }

  public toOp(): Op {
    const fontOpValue = this.originalAttributes.font ? { font: EnumFont.getFontName(this.originalAttributes.font) } : null
    return {
      insert: 1,
      attributes: { ...this.originalAttributes, date: this.dateContent.date, frag: FragmentDate.fragType, ...fontOpValue },
    }
  }

  public toHtml(): string {
    return `<span>${this.stringContent}</span>`
  }

  public toText(): string {
    return this.stringContent
  }

  public compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }
}
