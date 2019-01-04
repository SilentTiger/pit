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
      height: textMetrics.height,
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
    const currentValues: number[] = [];

    while (
      (
        currentValues[current] > freeSpace ||
      currentValues[current + 1] === undefined ||
      currentValues[current + 1] <= freeSpace
      ) && current < max
    ) {
      currentValues[current] = getTextMetrics(this.content.substr(0, current), this.attributes).width;
      if (currentValues[current] > freeSpace) {
        max = current;
        current = Math.ceil(min + (current - min) / 2);
      } else if (currentValues[current] === freeSpace) {
        break;
      } else if (currentValues[current] < freeSpace) {
        min = current;
        current = Math.ceil(current + (max - current) / 2);
      }
    }

    if (current === this.content.length) {
      return null;
    } else {
      const newFrag = new FragmentText(this.attributes, this.content.substr(current));
      this.content = this.content.substr(0, current);
      return newFrag;
    }
  }
}
