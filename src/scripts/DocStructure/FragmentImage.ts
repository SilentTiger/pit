import Fragment from "./Fragment";
import FragmentImageAttributes from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public attributes: FragmentImageAttributes;
  public content: string;
  constructor() {
    super();
  }
}
