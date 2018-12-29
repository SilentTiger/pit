import Fragment from "./Fragment";
import { FragmentDefaultAttributes } from "./FragmentAttributes";
import FragmentImageAttributes, { FragmentImageDefaultAttributes } from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public attributes: FragmentImageAttributes = {
    ...FragmentDefaultAttributes,
    ...FragmentImageDefaultAttributes,
  };
  public content: string;
  constructor(attr?: FragmentImageAttributes) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
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
