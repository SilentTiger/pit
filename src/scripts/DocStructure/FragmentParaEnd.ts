import Fragment from './Fragment';
import IFragmentParaEndAttributes, { FragmentParaEndDefaultAttributes } from './FragmentParaEndAttributes';
export default class FragmentParaEnd extends Fragment {
  public attributes: IFragmentParaEndAttributes = {
    ...FragmentParaEndDefaultAttributes,
  };
  public length = 1;

  constructor() {
    super();
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
    this.metrics = {
      baseline: 0,
      bottom: 0,
      emBottom: 0,
      emTop: 0,
    };
  }
}
