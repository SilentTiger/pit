import ICanvasContext from '../Common/ICanvasContext';
import { convertPt2Px, createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentDate from '../DocStructure/FragmentDate';
import Run from "./Run";

const dateColor = '#70b1e7';
export default class RunDate extends Run {
  public frag: FragmentDate;
  public content: string;
  public isSpace: boolean = false;
  constructor(frag: FragmentDate, x: number, y: number, textContent: string = frag.stringContent) {
    super(x, y);
    this.frag = frag;
    this.content = textContent;
    this.height = this.calHeight();
  }
  /**
   *  绘制 RunDate
   * @param ctx 绘图 api 接口
   */
  public draw(ctx: ICanvasContext, x: number, y: number): void {
    // 绘制文本内容
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillStyle = dateColor;
    ctx.fillText(
      this.content,
      this.x + x,
      this.parent === null
        ? this.frag.metrics.baseline
        : this.parent.baseline + y,
    );

    if ((window as any).runBorder) {
      ctx.strokeStyle = 'green';
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height);
    }
  }
  /**
   * 计算当前 RunDate 高度
   */
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size];
  }
  /**
   * 计算当前 RunDate 宽度
   */
  public calWidth(): number {
    return measureTextWidth(this.content, this.frag.attributes);
  }

  public getDocumentPos(x: number, y: number, tryHead?: boolean): number {
    if (x < this.width / 2) {
      return tryHead ? 0 : -1;
    } else {
      return 1;
    }
  }
}
