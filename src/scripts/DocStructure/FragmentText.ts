import ILayoutPiece from "../Common/ILayoutPiece";
import { convertPt2Px, measureTextWidth } from "../Common/Platform";
import { isScriptWord } from "../Common/util";
import { EnumAlign } from "./EnumParagraphStyle";
import Fragment from "./Fragment";
import FragmentTextAttributes, { FragmentTextDefaultAttributes } from "./FragmentTextAttributes";

export default class FragmentText extends Fragment {

  public attributes: FragmentTextAttributes = {
    ...FragmentTextDefaultAttributes,
  };
  public content: string;
  public layoutPiece: ILayoutPiece[];
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
  public canSplit = (): boolean => {
    return this.content.length > 1;
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
    // 构建 layoutPiece 的时候要考虑是否需要计算每个 piece 的宽度
    // 如果这段文本是左对齐、居中对齐、右对齐，且字间距是默认间距，则不需要计算每个 piece 的宽度（默认是 0）
    // 否则就要计算每个 piece 的宽度，以方便后续排版步骤
    this.content.split(' ').forEach((text) => {
      let scriptStarted = false;
      let scriptStartIndex = 0;
      for (let i = 0, l = text.length; i < l; i++) {
        if (!isScriptWord(text[i])) {
          if (scriptStarted) {
            this.layoutPiece.push({
              isSpace: false,
              text: text.substring(scriptStartIndex, i),
            });
          }
          this.layoutPiece.push({
            isSpace: false,
            text: text[i],
          });
          scriptStarted = false;
        } else {
          if (!scriptStarted) {
            scriptStarted = true;
            scriptStartIndex = i;
          }
        }
      }

      this.layoutPiece.push({
        isSpace: true,
        text: ' ',
      });
    });

    // 如果需要计算每个 piece 的宽度，就再一次遍历计算宽度
    if ((this.parent.attributes.align === EnumAlign.left ||
      this.parent.attributes.align === EnumAlign.center ||
      this.parent.attributes.align === EnumAlign.right) && this.attributes.letterSpacing === 0) {
      this.calPieceWidth();
    }
  }

  public calPieceWidth() {
    this.layoutPiece.forEach((piece) => {
      piece.width = measureTextWidth(piece.text, this.attributes);
    });
  }
}
