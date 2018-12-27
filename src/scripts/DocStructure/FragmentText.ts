import Fragment from "./Fragment";
import FragmentTextAttributes from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {
  public attributes: FragmentTextAttributes;
  public content: string;
  constructor() {
    super();
  }
}
