import ICanvasContext from "../Common/ICanvasContext";
import { convertPt2Px, createTextFontString, measureTextMetrics, measureTextWidth } from "../Common/Platform";
import { calListTypeFromChangeData } from "../Common/util";
import { EnumLineSpacing } from "./EnumParagraphStyle";
import { EnumFont } from "./EnumTextStyle";
import LayoutFrame from "./LayoutFrame";
import IListItemAttributes, { ListItemDefaultAttributes } from "./ListItemAttributes";
import IDocumentPos from "../Common/IDocumentPos";
import IRectangle from "../Common/IRectangle";

export default class ListItem {
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public start:number;
  public length = 0;
  public needLayout: boolean = true;
  public attributes: IListItemAttributes = {...ListItemDefaultAttributes};
  public maxWidth = 0;
  public frames: LayoutFrame[];
  public titleContent = '';
  public titleWidth = 0;
  public titleBaseline = 0;

  constructor(frames: LayoutFrame[], attrs: any) {
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
  }

  public layout() {
    if (this.needLayout) {
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
      const layoutMaxWidth = this.maxWidth - 26;
      let currentFrame: LayoutFrame;
      for (let i = 0, l = this.frames.length; i < l; i++) {
        currentFrame = this.frames[i];
        currentFrame.setMinMetrics({
          baseline: titleMetrics.baseline,
          bottom: titleMetrics.bottom,
        });
        currentFrame.setMaxWidth(layoutMaxWidth);
        currentFrame.x = 26;
        currentFrame.layout();
        if (i < l - 1) {
          this.frames[i + 1].y = Math.floor(currentFrame.y + currentFrame.height);
        }
        this.width = Math.max(this.width, currentFrame.x + currentFrame.width);
      }
      // 再比较 layoutframe 中的行的 baseline 和 title 中的 baseline 及 line height，取较大值
      const newBaseline = Math.max(titleMetrics.baseline, this.frames[0].lines[0].baseline);
      this.titleBaseline = newBaseline;

      this.needLayout = false;
      this.height = currentFrame.y + currentFrame.height;
    }
  }

  public render(ctx: ICanvasContext, x: number, y: number) {
    ctx.font = createTextFontString({
      italic: false,
      bold: false,
      size: this.attributes.size,
      font: EnumFont.Default,
    });
    ctx.fillStyle = this.attributes.color;
    ctx.fillText(this.titleContent, this.x + x + 6, this.y + y + this.titleBaseline);
    for (let i = 0, l = this.frames.length; i < l; i++) {
      const currentFrame = this.frames[i];
      currentFrame.draw(ctx, this.x + x, this.y + y);
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

  public getDocumentPos(x: number, y: number): IDocumentPos {
    for (let index = 0; index < this.frames.length; index++) {
      const frame = this.frames[index];
      if (
        (frame.y <= y && y <= frame.y + frame.height) ||
        (index === 0 && y < frame.y) ||
        (index === this.frames.length - 1 && y > frame.y + frame.height)
      ) {
        const posData = frame.getDocumentPos(x - frame.x, y - frame.y);
        posData.index += frame.start;
        posData.PosX += frame.x;
        posData.PosYLine += frame.y;
        posData.PosYText += frame.y;
        return posData;
      }
    }
    return null;
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    let rects: IRectangle[]=[];
    for (let frameIndex = 0; frameIndex < this.frames.length; frameIndex++) {
      const frame = this.frames[frameIndex];
      if (frame.start + frame.length <= index) { continue; }
      if (frame.start >= index + length) { break; }

      const frameOffset = index - frame.start;
      const frameLength = frameOffset < 0 ? length + frameOffset : length;
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
      this.frames[0].start = 0
    } else {
      return;
    }
    for (let index = 1; index < this.frames.length; index++) {
      this.frames[index].start = this.frames[index - 1].start + this.frames[index - 1].length;
    }
  }
}
