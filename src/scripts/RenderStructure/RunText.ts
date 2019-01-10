import ILayoutPiece from '../Common/ILayoutPiece';
import { convertPt2Px, createTextFontString, measureTextWidth } from '../Common/Platform';
import FragmentText from '../DocStructure/FragmentText';
import { FragmentTextDefaultAttributes } from '../DocStructure/FragmentTextAttributes';
import Run from "./Run";

export default class RunText extends Run {
  public frag: FragmentText;
  public content: string;
  public layoutPiece: ILayoutPiece[] = [];
  constructor(frag: FragmentText, x: number, y: number, layoutPiece?: ILayoutPiece[]) {
    super(frag, x, y);
    this.layoutPiece = layoutPiece || frag.layoutPiece;
    this.calContent();
    this.setSize();
  }

  public draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.textBaseline = 'top';
    // 绘制背景色
    if (this.frag.attributes.background !== FragmentTextDefaultAttributes.background) {
      ctx.fillStyle = this.frag.attributes.background;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    ctx.font = createTextFontString(this.frag.attributes);
    ctx.fillStyle = this.frag.attributes.color;
    ctx.fillText(this.content, this.x, this.y);
    // 绘制下划线
    if (this.frag.attributes.underline) {
      ctx.beginPath();
      ctx.strokeStyle = this.frag.attributes.color;
      ctx.lineWidth = 1;
      const lineY = this.y + this.height / 2;
      ctx.moveTo(this.x, lineY);
      ctx.lineTo(this.x + this.width, lineY);
      ctx.stroke();
    }
    // 绘制删除线
    if (this.frag.attributes.strike) {
      ctx.beginPath();
      ctx.strokeStyle = this.frag.attributes.color;
      ctx.lineWidth = 1;
      const lineY = this.y + this.height;
      ctx.moveTo(this.x, lineY);
      ctx.lineTo(this.x + this.width, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }

  public split = (freeSpace: number, breakWord: boolean = false): null | Run => {
    if (this.width <= freeSpace) {
      return null;
    }

    let breakPoint: number|undefined;

    for (let i = 0, l = this.layoutPiece.length; i < l; i++) {
      const pieceWidth = this.layoutPiece[i].width;
      if (freeSpace < pieceWidth) {
        // 说明不 break word 查找 break point 的过程已经结束
        break;
      } else {
        breakPoint = i;
        freeSpace -= pieceWidth;
      }
    }

    let resRun: RunText;
    // 如果可以 break word 并且没有找到断行点，则开始在 break word 模式下断行
    if (breakWord && breakPoint === undefined) {
      // 没有找到断行点，说明第一个 piece 都放不下，那就拆分第一个 piece 成一个个的字符进行断行
      // TODO
    } else {
      resRun = new RunText(this.frag, 0, 0, this.layoutPiece.slice(breakPoint));
      this.layoutPiece.length = breakPoint;
      this.calContent();

    }
    this.setSize();
    return resRun;

  }

  public calContent() {
    this.content = this.layoutPiece.map((piece) => piece.text).join('');
  }

  public calSize = () => {
    return {
      height: convertPt2Px[this.frag.attributes.size],
      width: measureTextWidth(this.content, this.frag.attributes),
    };
  }

  public separate = (): RunText[] => {
    const runs = this.layoutPiece.filter((piece) => !piece.isSpace).map((piece) => {
      return new RunText(this.frag, this.x, this.y, [piece]);
    });

    return runs;
  }
}
