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
      this.initAttributes(attr);
    }
  }
}
