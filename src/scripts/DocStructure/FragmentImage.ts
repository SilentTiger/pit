import Fragment from "./Fragment";
import FragmentImageAttributes, { FragmentImageDefaultAttributes } from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public attributes: FragmentImageAttributes = {
    ...FragmentImageDefaultAttributes,
  };
  public content: string;
  public readonly length: number = 1;
  constructor(attr?: FragmentImageAttributes) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
    this.calMetrics();
  }

  public calSize = () => {
    return {
      height: this.attributes.oriHeight,
      width: this.attributes.oriWidth,
    };
  }

  public calMetrics(): void {
    this.metrics = {
      baseline: this.attributes.oriHeight,
      bottom: this.attributes.oriHeight,
      emBottom: this.attributes.oriHeight,
      emTop: 0,
    };
  }

  protected setAttributes(attr: any) {
    super.setAttributes(attr);
    if (attr['ori-height'] !== undefined) {
      this.attributes.oriHeight = parseInt(attr['ori-height'], 10);
    }
    if (attr['ori-width'] !== undefined) {
      this.attributes.oriWidth = parseInt(attr['ori-width'], 10);
    }
  }
}
