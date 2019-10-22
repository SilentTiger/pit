import Op from 'quill-delta/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { measureTextMetrics } from '../Common/Platform'
import { EnumFont } from './EnumTextStyle'
import Fragment from './Fragment'
import IFragmentParaEndAttributes, { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes'

export default class FragmentParaEnd extends Fragment {
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentParaEndAttributes = FragmentParaEndDefaultAttributes;
  public readonly length = 1;

  protected defaultAttrs = FragmentParaEndDefaultAttributes;
  protected originAttrs: Partial<IFragmentParaEndAttributes> = {};

  constructor() {
    super()
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
      font: EnumFont.get('Default'),
    })
  }

  public toOp(): Op {
    return {
      insert: '\n',
    }
  }

  public toHtml(): string {
    return ''
  }
}
