import Fragment from "./Fragment";
import FragmentImageAttributes, { FragmentImageDefaultAttributes } from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public attributes: FragmentImageAttributes = {
    ...FragmentImageDefaultAttributes,
  };
  public content: string;
  constructor(attr?: FragmentImageAttributes) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
  }

  public calWidth = () => {
    return this.attributes.oriWidth;
  }
  public canSplit = (): boolean => false;
  public split = (freeSpace: number): null => {
    return null;
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
