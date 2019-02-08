import { convertPt2Px } from '../Common/Platform';
import Fragment from './Fragment';
import FragmentParaEndAttributes, { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes';
export default class FragmentParaEnd extends Fragment {
  public attributes: FragmentParaEndAttributes = {
    ...FragmentParaEndDefaultAttributes,
  };
  public length = 1;

  constructor() {
    super();
    this.calMetrics();
  }

  public calSize = () => {
    return {
      height: convertPt2Px[this.attributes.size],
      width: 0,
    };
  }

  public calMetrics(): void {
    this.metrics = {
      baseline: convertPt2Px[this.attributes.size],
      bottom: convertPt2Px[this.attributes.size],
      emBottom: convertPt2Px[this.attributes.size],
      emTop: 0,
    };
  }
}
