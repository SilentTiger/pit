
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform';
import { EnumFont } from './EnumTextStyle';
import Fragment from "./Fragment";
import FragmentDateAttributes, { FragmentDateDefaultAttributes } from "./FragmentDateAttributes";

export default class FragmentDate extends Fragment {
  public attributes: FragmentDateAttributes = {
    ...FragmentDateDefaultAttributes,
  };
  public dateContent: { date: number, type: 'date' | 'date-time', id: number };
  public length = 1;
  public readonly stringContent: string;
  constructor(attr: FragmentDateAttributes, content: any) {
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

  public calMetrics() {
    this.metrics = measureTextMetrics(this.attributes);
  }
}
