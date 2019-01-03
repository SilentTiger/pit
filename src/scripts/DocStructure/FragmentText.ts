import { getTextMetrics } from "../Common/Platform";
import Fragment from "./Fragment";
import FragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {
  public attributes: FragmentTextAttributes = {
    ...FragmentTextDefaultAttributes,
  };
  public content: string;
  constructor(attr?: FragmentTextAttributes, content?: string) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
    if (content !== undefined) {
      this.content = content;
    }
  }

  public calWidth = (): number => {
    const textMetrics = getTextMetrics(this.content, this.attributes);
    return textMetrics.width;
  }

  public canSplit = (): boolean => {
    return this.content.length > 1;
  }

  public split = (freeSpace: number): null | FragmentText => {
    let length = this.content.length;
    for (; length >= 1; length--) {
      if (getTextMetrics(this.content.substr(0, length), this.attributes).width <= freeSpace) {
        break;
      }
    }

    if (length === this.content.length) {
      return null;
    } else {
      return new FragmentText(this.attributes, this.content.substr(length));
    }
  }
}
