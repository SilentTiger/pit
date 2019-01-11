import ILayoutPiece from "../Common/ILayoutPiece";
import { convertPt2Px, measureTextWidth } from "../Common/Platform";
import { isScriptWord } from "../Common/util";
import Fragment from "./Fragment";
import FragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {

  public attributes: FragmentTextAttributes = {
    ...FragmentTextDefaultAttributes,
  };
  public content: string;
  public layoutPiece: ILayoutPiece[] = [];
  constructor(attr?: FragmentTextAttributes, content?: string) {
    super();
    if (attr !== undefined) {
      this.setAttributes(attr);
    }
    if (content !== undefined) {
      this.content = content;
    }

    this.constructLayoutPiece();
  }

  public calSize = (): { width: number; height: number; } => {
    return {
      height: convertPt2Px[this.attributes.size],
      width: measureTextWidth(this.content, this.attributes),
    };
  }
  public canSplit = (freeSpace: number): boolean => {
    return this.content.length > 1 && freeSpace >= this.layoutPiece[0].width;
  }
  public split = (freeSpace: number): null | FragmentText => {
    let current = 1;
    let min = 1;
    let max = this.content.length;
    const currentValues: number[] = [];

    while (max - min > 2) {
      currentValues[current] = measureTextWidth(this.content.substr(0, current), this.attributes);
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

    let index = max;
    for (; index >= min; index--) {
      currentValues[index] = currentValues[index] ||
        measureTextWidth(this.content.substr(0, index), this.attributes);
      if (currentValues[index] <= freeSpace) {
        break;
      }
    }

    if (index === this.content.length) {
      return null;
    } else {
      const newFrag = new FragmentText(this.attributes, this.content.substr(index));
      this.content = this.content.substr(0, index);
      return newFrag;
    }
  }

  public constructLayoutPiece() {
    this.content.split(' ').forEach((text, index, textArr) => {
      let scriptStarted = false;
      let scriptStartIndex = 0;
      for (let i = 0, l = text.length; i < l; i++) {
        const textPiece = text[i];
        if (!isScriptWord(textPiece)) {
          if (scriptStarted) {
            this.layoutPiece.push({
              isSpace: false,
              text: text.substring(scriptStartIndex, i),
              width: measureTextWidth(text.substring(scriptStartIndex, i), this.attributes),
            });
          }
          this.layoutPiece.push({
            isSpace: false,
            text: textPiece,
            width: measureTextWidth(textPiece, this.attributes),
          });
          scriptStarted = false;
        } else {
          if (!scriptStarted) {
            scriptStarted = true;
            scriptStartIndex = i;
          }
        }
      }
      if (scriptStarted) {
        const t = text.substring(scriptStartIndex);
        this.layoutPiece.push({
          isSpace: false,
          text: t,
          width: measureTextWidth(t, this.attributes),
        });
      }

      if (index < textArr.length - 1) {
        this.layoutPiece.push({
          isSpace: true,
          text: ' ',
          width: measureTextWidth(' ', this.attributes),
        });
      }
    });
  }
}
