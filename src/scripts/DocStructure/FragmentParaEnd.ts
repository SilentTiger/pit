import Fragment from './Fragment';
export default class FragmentParaEnd extends Fragment {
  public length = 1;

  public calSize = () => {
    return {
      height: 0,
      width: 0,
    };
  }

  public calMetrics(): void {
    this.metrics = {
      baseline: 0,
      bottom: 0,
      emBottom: 0,
      emTop: 0,
    };
  }
}
