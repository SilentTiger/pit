
import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform'
import { findKeyByValueInMap } from '../Common/util'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import IFragmentDateAttributes, { FragmentDateDefaultAttributes } from './FragmentDateAttributes'

export default class FragmentDate extends Fragment {
  public static readonly fragType: string = 'date'
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentDateAttributes = FragmentDateDefaultAttributes;
  public dateContent: { date: number; type: 'date' | 'date-time'; id: number } = {
    date: Date.now(),
    type: 'date',
    id: 0,
  };
  public stringContent: string = '';
  public readonly length = 1;

  protected readonly defaultAttrs = FragmentDateDefaultAttributes;
  protected originAttrs: Partial<IFragmentDateAttributes> = {};

  public readFromOps(Op: Op): void {
    const attr = Op.attributes
    if (attr !== undefined) {
      this.setAttributes(attr)
      if (attr.font) {
        this.attributes.font = EnumFont.get((attr as any).font)
      }
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
    return {
      insert: 1,
      attributes: { ...this.originAttrs, date: this.dateContent.date, frag: FragmentDate.fragType },
    }
  }

  public toHtml(): string {
    return `<span>${this.stringContent}</span>`
  }

  /**
   * 获取当前 fragment 的属性
   */
  public getFormat() {
    const attrs: IFragmentDateAttributes = { ...this.attributes }
    const findKeyRes = findKeyByValueInMap(EnumFont, attrs.font)
    if (findKeyRes.find) {
      attrs.font = findKeyRes.key[0]
    }
    return attrs
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
