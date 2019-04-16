
import Delta from 'quill-delta';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform';
import { EnumFont } from './EnumTextStyle';
import Fragment from "./Fragment";
import IFragmentDateAttributes, { FragmentDateDefaultAttributes } from "./FragmentDateAttributes";

export default class FragmentDate extends Fragment {
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentDateAttributes = {
    ...FragmentDateDefaultAttributes,
  };
  public dateContent: { date: number; type: "date" | "date-time"; id: number };
  public readonly length = 1;
  public readonly stringContent: string;

  protected defaultAttributes = FragmentDateDefaultAttributes;
  constructor(attr: IFragmentDateAttributes, content: any) {
    super();
    this.setAttributes(attr);
    if (attr.font) {
      this.attributes.font = EnumFont[(attr as any).font] as EnumFont;
    }
    this.dateContent = content;
    this.stringContent = "⏰" + new Date(this.dateContent.date).toDateString();
    this.calMetrics();
  }

  public calSize = (): { width: number; height: number } => {
    return {
      height: convertPt2Px[this.attributes.size],
      width: measureTextWidth(this.stringContent, this.attributes),
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
    return `<span>${this.stringContent}</span>`;
  }
}
