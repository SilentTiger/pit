import IDocumentPos from '../Common/IDocumentPos';
import { createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentText from '../DocStructure/FragmentText';
import Run from "./Run";

export default class RunText extends Run {
  public frag: FragmentText;
  public content: string;
  public isSpace: boolean = false;
  constructor(frag: FragmentText, x: number, y: number, textContent: string = frag.content) {
    super(frag, x, y);
    this.content = textContent;
    this.length = textContent.length;
    this.height = this.calHeight();
  }

  public draw(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // 绘制文本内容
    if (this.prevSibling === null || this.prevSibling.frag !== this.frag) {
      ctx.font = createTextFontString(this.frag.attributes);
      if (this.frag.attributes.link.length === 0) {
        ctx.fillStyle = this.frag.attributes.color;
      } else {
        ctx.fillStyle = '#70b1e7';
      }
    }
    ctx.fillText(this.content, this.x + x, this.parent.baseline + y);

    if ((window as any).runBorder) {
      ctx.strokeStyle = 'green';
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height);
    }
  }
  public calHeight(): number {
    return this.frag.metrics.bottom;
  }
  public calWidth(): number {
    return measureTextWidth(this.content, this.frag.attributes);
  }

  public getDocumentPos(x: number, y: number, tryHead = false): Partial<IDocumentPos> {
    // 按说 run 的 length 不会是 0，所以这里就先不管 length === 0 的场景了
    if (this.length === 1) {
      if (x < this.width / 2) {
        return tryHead ? {
          index: 0,
          color: this.frag.attributes.color,
          textHeight: this.height,
          PosX: 0,
          PosYText: 0,
        } : null;
      } else {
        return {
          index: 1,
          color: this.frag.attributes.color,
          textHeight: this.height,
          PosX: this.width,
          PosYText: 0,
        };
      }
    } else if (this.length > 1) {
      const widthArray = [0];
      for (let l = 1; l <= this.content.length; l++) {
        const subContent = this.content.substr(0, l);
        const subContentWidth = measureTextWidth(subContent, this.frag.attributes);
        widthArray.push(subContentWidth);
        if (subContentWidth >= x) {
          const currentWidth = subContentWidth - widthArray[l - 1];
          if (x - widthArray[l - 1] < currentWidth / 2) {
            if (l === 1) {
              return tryHead ? {
                index: 0,
                color: this.frag.attributes.color,
                textHeight: this.height,
                PosX: 0,
                PosYText: 0,
              } : null;
            } else {
              return {
                index: l - 1,
                color: this.frag.attributes.color,
                textHeight: this.height,
                PosX: widthArray[l - 1],
                PosYText: 0,
              };
            }
          } else {
            return {
              index: l,
              color: this.frag.attributes.color,
              textHeight: this.height,
              PosX: subContentWidth,
              PosYText: 0,
            };
          }
        }
      }
      return {
        index: this.content.length,
        color: this.frag.attributes.color,
        textHeight: this.height,
        PosX: this.width,
        PosYText: 0,
      }
    }
  }

  public getCoordinatePosX(index: number): number {
    if (index === 0) {
      return 0;
    }
    return measureTextWidth(this.content.substr(0, index), this.frag.attributes);
  }
}
