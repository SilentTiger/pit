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

  public calSize = (): { width: number; height: number; } => {
    const textMetrics = getTextMetrics(this.content, this.attributes);
    return {
      height: textMetrics.actualBoundingBoxRight - textMetrics.actualBoundingBoxLeft,
      width: textMetrics.width,
    };
  }
  public canSplit = (): boolean => {
    return this.content.length > 1;
  }

  public split = (freeSpace: number): null | FragmentText => {
    let current = 1;
    let min = 1;
    let max = this.content.length;

    while (min + 1 < max) {
      if (getTextMetrics(this.content.substr(0, current), this.attributes).width > freeSpace) {
        max = current;
        current = Math.ceil(min + (current - min) / 2);
      } else if (getTextMetrics(this.content.substr(0, current), this.attributes).width === freeSpace) {
        break;
      } else if (getTextMetrics(this.content.substr(0, current), this.attributes).width < freeSpace) {
        min = current;
        current = Math.ceil(current + (max - current) / 2);
      }
    }

    if (current === this.content.length) {
      return null;
    } else {
      this.content = this.content.substr(0, current);
      return new FragmentText(this.attributes, this.content.substr(current));
    }
  }
}
