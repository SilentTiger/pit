
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform';
import { EnumFont } from './EnumTextStyle';
import Fragment from "./Fragment";
import IFragmentDateAttributes, { FragmentDateDefaultAttributes } from "./FragmentDateAttributes";

export default class FragmentDate extends Fragment {
  public attributes: IFragmentDateAttributes = {
    ...FragmentDateDefaultAttributes,
  };
  public dateContent: { date: number, type: 'date' | 'date-time', id: number };
  public length = 1;
  public readonly stringContent: string;
  constructor(attr: IFragmentDateAttributes, content: any) {
    super();
    this.setAttributes(attr);
    if (attr.font) {
      this.attributes.font = EnumFont[(attr as any).font] as EnumFont;
    }
    this.dateContent = content;
    this.stringContent = '⏰' + (new Date(this.dateContent.date)).toDateString();
    this.calMetrics();
  }

  public calSize = (): { width: number; height: number; } => {
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
}
