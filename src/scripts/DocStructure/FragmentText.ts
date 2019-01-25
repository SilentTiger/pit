import FontMetrics from '../../assets/FontMetrics';
import { convertPt2Px, measureTextWidth } from '../Common/Platform';
import Fragment from "./Fragment";
import FragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {

  public attributes: FragmentTextAttributes = {
    ...FragmentTextDefaultAttributes,
  };
  public content: string;
  constructor(attr?: FragmentTextAttributes, content?: string) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
    if (content !== undefined) {
      this.content = content;
    }
    this.calBaseline();
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

  private calBaseline() {
    this.baseline = FontMetrics({
      fontFamily: this.attributes.font,
      fontSize: this.attributes.size,
      fontWeight: this.attributes.bold ? 'bold' : 'normal',
      origin: 'top',
    }).baseline * this.attributes.size;
  }
}
