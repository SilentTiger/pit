import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import { measureTextMetrics } from '../Common/Platform';
import { EnumFont } from './EnumTextStyle';
import { IFormatAttributes } from './FormatAttributes';
import Fragment from './Fragment';
import IFragmentParaEndAttributes, { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes';

export default class FragmentParaEnd extends Fragment {
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentParaEndAttributes = FragmentParaEndDefaultAttributes;
  public readonly length = 1;

  protected defaultAttrs = FragmentParaEndDefaultAttributes;
  protected originAttrs: Partial<IFragmentParaEndAttributes> = {};

  constructor(op: Op) {
    super(op);
    this.calMetrics();
  }

  public calSize = () => {
    return {
      height: 0,
      width: 0,
    };
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics(): void {
    this.metrics = measureTextMetrics({
      bold: false,
      size: this.attributes.size,
      font: EnumFont.Default,
    });
  }

  public toDelta(): Delta {
    return new Delta();
  }

  public toHtml(): string {
    return '';
  }
}
