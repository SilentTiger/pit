
import Op from 'quill-delta/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform'
import { findKeyByValueInMap } from '../Common/util'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import IFragmentDateAttributes, { FragmentDateDefaultAttributes } from './FragmentDateAttributes'

export default class FragmentDate extends Fragment {
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentDateAttributes = FragmentDateDefaultAttributes;
  public dateContent: { date: number; type: 'date' | 'date-time'; id: number };
  public readonly length = 1;
  public readonly stringContent: string;

  protected readonly defaultAttrs = FragmentDateDefaultAttributes;
  protected originAttrs: Partial<IFragmentDateAttributes> = {};

  constructor(attr: Partial<IFragmentDateAttributes>, content: any) {
    super()
    this.setAttributes(attr)
    if (attr.font) {
      this.attributes.font = EnumFont.get((attr as any).font)
    }
    this.dateContent = content
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
      insert: { 'date-mention': { date: this.dateContent.date, type: 'date-time' } },
      attributes: { ...this.originAttrs },
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
