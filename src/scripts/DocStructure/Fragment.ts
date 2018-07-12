import FragmentImageAttributes from "./FragmentImageAttributes";
import FragmentTextAttributes from "./FragmentTextAttributes";
import Paragraph from "./Paragraph";

export default abstract class Fragment {
  public prevSibling: Fragment;
  public nextSibling: Fragment;
  public parent: Paragraph;
  public attributes: FragmentImageAttributes | FragmentTextAttributes;
}
