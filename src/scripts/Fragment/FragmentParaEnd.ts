import type Op from 'quill-delta-enhanced/dist/Op'
import type { IAttributable } from '../Common/IAttributable'
import { getPlatform } from '../Platform'
import { EnumFont } from '../Common/EnumTextStyle'
import Fragment from './Fragment'
import type IFragmentParaEndAttributes from './FragmentParaEndAttributes'
import { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes'

export default class FragmentParaEnd extends Fragment implements IAttributable {
  public static override readonly fragType: string = 'end'
  public override defaultAttributes: IFragmentParaEndAttributes = FragmentParaEndDefaultAttributes
  public override attributes: IFragmentParaEndAttributes = { ...FragmentParaEndDefaultAttributes }

  public override readFromOps(Op: Op): void {
    this.calMetrics()
  }

  /**
   * 计算当前 fragment 的 metrics
   */
  public override calMetrics(): void {
    this.metrics = getPlatform().measureTextMetrics({
      bold: false,
      size: this.attributes.size,
      font: EnumFont.getFontValue('Default')!,
    })
  }

  public override toOp(withKey: boolean): Op {
    const op: Op = {
      insert: 1,
      attributes: { frag: FragmentParaEnd.fragType },
    }
    if (withKey) {
      op.key = this.id
    }
    return op
  }

  public override toHtml(): string {
    return ''
  }

  public override toText(): string {
    return '\n'
  }

  public override compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }

  public override lastPos() {
    return { index: 0, inner: null }
  }
}
