
import { convertPt2Px, measureTextMetrics, measureTextWidth } from '../Common/Platform';
import { EnumFont } from './EnumTextStyle';
import Fragment from "./Fragment";
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {

  public attributes: IFragmentTextAttributes = {
    ...FragmentTextDefaultAttributes,
  };
  public content: string;
  constructor(attr?: IFragmentTextAttributes, content?: string) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
      if (attr.font) {
        this.attributes.font = EnumFont[(attr as any).font] as EnumFont;
      }
    }
    if (content !== undefined) {
      this.content = content;
    }
    this.calMetrics();
  }

  get length(): number {
    return this.content.length;
  }

  public calSize = (): { width: number; height: number; } => {
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
}
