
import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import IRange from '../Common/IRange';
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform';
import { EnumFont } from './EnumTextStyle';
import { IFormatAttributes } from './FormatAttributes';
import Fragment from "./Fragment";
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {
  public metrics!: IFragmentMetrics;
  public defaultAttrs = FragmentTextDefaultAttributes;
  public originAttrs: Partial<IFragmentTextAttributes> = {};
  public attributes: IFragmentTextAttributes = FragmentTextDefaultAttributes;
  public content: string;
  constructor(op: Op, attr: IFragmentTextAttributes, content: string) {
    super(op);
    if (attr !== undefined) {
      this.setAttributes(attr);
      if (attr.font) {
        this.attributes.font = EnumFont[(attr as any).font] as EnumFont;
      }
    }
    this.content = content;
    this.calMetrics();
  }

  get length(): number {
    return this.content.length;
  }

  public calSize = (): { width: number; height: number } => {
    return {
      height: convertPt2Px[this.attributes.size],
      width: measureTextWidth(this.content, this.attributes),
    };
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics() {
    this.metrics = measureTextMetrics(this.attributes);
  }

  public toDelta(): Delta {
    throw new Error('not implement');
  }

  public toHtml(): string {
    return `<span>${this.content}</span>`;
  }

  public delete(index: number, length: number) {
    const charArray = this.content.split('');
    charArray.splice(index, length);
    this.content = charArray.join('');
    super.delete(index, length);
  }

  public format(attr: IFormatAttributes, range?: IRange): void {
    if (!range) {
      this.setAttributes(attr);
    } else {
      throw new Error('error format text');
    }
  }
}
