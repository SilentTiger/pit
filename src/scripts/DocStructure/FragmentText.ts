
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
  public attributes: IFragmentTextAttributes = FragmentTextDefaultAttributes;
  public content: string;

  protected defaultAttrs = FragmentTextDefaultAttributes;
  protected originAttrs: Partial<IFragmentTextAttributes> = {};

  constructor(op: Op, attr: Partial<IFragmentTextAttributes>, content: string) {
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
    if (!range || (range.index === 0 && range.length === this.length)) {
      this.setAttributes(attr);
    } else {
      const newContentString = this.content.substr(range.index, range.length);
      const newContentAttrs = Object.assign({}, this.originAttrs, attr);
      const newContentFrag = new FragmentText(
        { insert: newContentString, attributes: newContentAttrs },
        newContentAttrs,
        newContentString,
      );
      if (range.index === 0) {
        this.content = this.content.substr(range.length);
        this.parent!.addBefore(newContentFrag, this);
      } else if (range.index + range.length === this.length) {
        this.content = this.content.substr(0, range.index);
        this.parent!.addAfter(newContentFrag, this);
      } else {
        const headContent = this.content.substr(0, range.index);
        this.content = this.content.substr(range.index + range.length);
        this.parent!.addBefore(newContentFrag, this);
        this.parent!.addBefore(new FragmentText(
          {insert: headContent, attributes: this.originAttrs},
          this.originAttrs,
          headContent,
        ), newContentFrag);
      }
    }
  }
}
