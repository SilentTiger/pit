import Fragment from "./Fragment";
import FragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {
  public attributes: FragmentTextAttributes = {
    ...FragmentTextDefaultAttributes,
  };
  public content: string;
  constructor(attr?: FragmentTextAttributes) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
  }
}
