import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import { convertPt2Px, createTextFontString, measureTextMetrics, measureTextWidth } from "../Common/Platform";
import { calListItemTitle, calListTypeFromChangeData } from "../Common/util";
import Block from "./Block";
import { EnumListType } from "./EnumListStyle";
import { EnumLineSpacing } from "./EnumParagraphStyle";
import { EnumFont } from "./EnumTextStyle";
import LayoutFrame from "./LayoutFrame";
import IListItemAttributes, { ListItemDefaultAttributes } from "./ListItemAttributes";

export default class ListItem extends Block {
  public attributes: IListItemAttributes = {...ListItemDefaultAttributes};
  public frames: LayoutFrame[];
  public titleContent = '';
  public titleWidth = 0;
  public titleBaseline = 0;
  public titleIndex: number = 0;
  public titleParent: string = '';

  constructor(frames: LayoutFrame[], attrs: any, maxWidth: number) {
    super();
    this.frames = frames;
    this.setAttributes(attrs);
    this.frames.forEach((frame) => {
      frame.setAttributes({
        linespacing: this.attributes.linespacing,
      });
    });
    this.length = frames.reduce((sum: number, f: LayoutFrame) => {
      return sum + f.length;
    }, 0);
    this.setFrameStart();
    this.width = maxWidth;
  }

  public layout() {
    if (this.needLayout) {
      this.setTitleIndex();
      this.setTitleContent(calListItemTitle(
        this.attributes.type,
        this.attributes.indent,
        this.titleIndex,
        this.titleParent,
      ));

      // 先对列表项 title 文字排版，算出宽度、行高、baseline 位置
      this.titleWidth = measureTextWidth(this.titleContent, {
        italic: false,
        bold: false,
        size: this.attributes.size,
        font: EnumFont.Default,
      });
      const titleMetrics = measureTextMetrics({
        bold: false,
        size: this.attributes.size,
        font: EnumFont.Default,
      });

      const newMetricsBottom = convertPt2Px[this.attributes.size] * EnumLineSpacing.get(this.attributes.linespacing);
      const newMetricsBaseline = (newMetricsBottom - titleMetrics.bottom) / 2 + titleMetrics.baseline;
      titleMetrics.bottom = newMetricsBottom;
      titleMetrics.baseline = newMetricsBaseline;

      // 再对 frame 内容排版
      this.frames[0].setFirstIndent(Math.max(10 + this.titleWidth - 26, 0));
      const offsetX = 26 * this.attributes.indent;
      const layoutMaxWidth = this.width - offsetX;
      let currentFrame: LayoutFrame;
      for (let i = 0, l = this.frames.length; i < l; i++) {
        currentFrame = this.frames[i];
        currentFrame.setMinMetrics({
          baseline: titleMetrics.baseline,
          bottom: titleMetrics.bottom,
        });
        currentFrame.setMaxWidth(layoutMaxWidth - 26);
        currentFrame.x = offsetX + 26;
        currentFrame.layout();
        if (i < l - 1) {
          this.frames[i + 1].y = Math.floor(currentFrame.y + currentFrame.height);
        }
        this.width = Math.max(this.width, currentFrame.x + currentFrame.width);
      }
      // 再比较 layoutFrame 中的行的 baseline 和 title 中的 baseline 及 line height，取较大值
      const newBaseline = Math.max(titleMetrics.baseline, this.frames[0].lines[0].baseline);
      this.titleBaseline = newBaseline;

      this.needLayout = false;
      const height = currentFrame!.y + currentFrame!.height;
      const heightChange = height !== this.height ? { height } : null;
      if (heightChange !== null) {
        this.setSize({ ...heightChange });
        if (heightChange !== null && this.nextSibling !== null) {
          this.nextSibling.setPositionY(this.y + this.height);
        }
      }
    }
  }

  public render(ctx: ICanvasContext, scrollTop: number) {
    const offsetX = 26 * this.attributes.indent;
    ctx.font = createTextFontString({
      italic: false,
      bold: false,
      size: this.attributes.size,
      font: EnumFont.Default,
    });
    ctx.fillStyle = this.attributes.color;
    ctx.fillText(this.titleContent, this.x + 6 + offsetX, this.y + this.titleBaseline - scrollTop);
    for (let i = 0, l = this.frames.length; i < l; i++) {
      const currentFrame = this.frames[i];
      currentFrame.draw(ctx, this.x, this.y - scrollTop);
    }
  }

  public setAttributes(attrs: any) {
    const keys = Object.keys(this.attributes);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if (attrs[key] !== undefined) {
        (this.attributes as any)[key] = attrs[key];
      }
    }

    this.attributes.listId = attrs['list-id'];
    const listType = attrs.ordered || attrs.bullet;
    this.attributes.type = calListTypeFromChangeData(listType);
  }

  public setTitleContent(titleContent: string) {
    this.titleContent = titleContent;
  }

  public getDocumentPos(x: number, y: number): number {
    x = x - this.x;
    y = y - this.y;
    for (let index = 0; index < this.frames.length; index++) {
      const frame = this.frames[index];
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.frames.length - 1 && y > frame.y + frame.height)
      ) {
        return frame.getDocumentPos(x - frame.x, y - frame.y) + frame.start;
      }
    }
    return -1;
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    let rects: IRectangle[] = [];
    let offset  = index - this.start;
    const blockLength = offset < 0 ? length + offset : length;
    offset = Math.max(0, offset);
    for (let frameIndex = 0; frameIndex < this.frames.length; frameIndex++) {
      const frame = this.frames[frameIndex];
      if (frame.start + frame.length <= offset) { continue; }
      if (frame.start > offset + blockLength) { break; }

      const frameOffset = offset - frame.start;
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength;
      const frameRects = frame.getSelectionRectangles(Math.max(frameOffset, 0), frameLength);
      for (let rectIndex = 0; rectIndex < frameRects.length; rectIndex++) {
        const rect = frameRects[rectIndex];
        rect.y += this.y;
        rect.x += this.x;
      }
      rects = rects.concat(frameRects);
    }

    return rects;
  }

  private setFrameStart() {
    if (this.frames.length > 0) {
      this.frames[0].start = 0;
    } else {
      return;
    }
    for (let index = 1; index < this.frames.length; index++) {
      this.frames[index].start = this.frames[index - 1].start + this.frames[index - 1].length;
    }
  }

  private setTitleIndex() {
    let index = 0;
    let parentTitle = '';

    let findIndex = false;
    let findParentTitle = this.attributes.type !== EnumListType.ol_3;

    let currentListItem = this.prevSibling;
    while (currentListItem !== null) {
      if (
        currentListItem instanceof ListItem &&
        currentListItem.attributes.listId === this.attributes.listId
      ) {
        const levelOffset = this.attributes.indent - currentListItem.attributes.indent;

        if (levelOffset === 0) {
          findIndex = true;
          findParentTitle = true;
          index = currentListItem.titleIndex + 1;
          parentTitle = currentListItem.titleParent;
        } else if (levelOffset > 0) {
          parentTitle = currentListItem.titleContent;
          for (let i = 1; i < levelOffset; i++) {
            parentTitle += "1.";
          }
          findParentTitle = true;
          findIndex = true;
        } else if (levelOffset < 0) {
          index = 1;
        }
      }

      if (findIndex && findParentTitle) {
        break;
      } else {
        currentListItem = currentListItem.prevSibling;
      }
    }
    this.titleIndex = index;
    this.titleParent = parentTitle;
  }
}
