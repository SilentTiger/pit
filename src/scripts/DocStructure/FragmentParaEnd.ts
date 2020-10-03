import Op from 'quill-delta-enhanced/dist/Op'
import { IAttributable } from '../Common/IAttributable'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { measureTextMetrics } from '../Common/Platform'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import IFragmentParaEndAttributes, { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes'

export default class FragmentParaEnd extends Fragment implements IAttributable {
  defaultAttributes: IFragmentParaEndAttributes = FragmentParaEndDefaultAttributes
  attributes: IFragmentParaEndAttributes = FragmentParaEndDefaultAttributes

  public static readonly fragType: string = 'end'
  public metrics!: IFragmentMetrics;

  public readFromOps(Op: Op): void {
    this.calMetrics()
  }

  public calSize() {
    return {
      height: 0,
      width: 0,
    }
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics(): void {
    this.metrics = measureTextMetrics({
      bold: false,
      size: this.attributes.size,
      font: EnumFont.getFontValue('Default')!,
    })
  }

  public toOp(): Op {
    return {
      insert: 1,
      attributes: { frag: FragmentParaEnd.fragType },
    }
  }

  public toHtml(): string {
    return ''
  }

  public toText(): string {
    return '\n'
  }
}
