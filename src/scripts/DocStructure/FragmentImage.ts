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
  }

  public calSize = () => {
    return {
      height: this.attributes.oriHeight,
      width: this.attributes.oriWidth,
    };
  }

  protected setAttributes(attr: any) {
    super.setAttributes(attr);
    if (attr['ori-height'] !== undefined) {
      this.attributes.oriHeight = attr['ori-height'];
    }
    if (attr['ori-width'] !== undefined) {
      this.attributes.oriWidth = attr['ori-width'];
    }
  }
}
