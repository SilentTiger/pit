import { convertPt2Px } from '../Common/Platform';
import FragmentParaEnd from '../DocStructure/FragmentParaEnd';
import Run from "./Run";
import IDocumentPos from '../Common/IDocumentPos';

export default class RunParaEnd extends Run {
  public frag: FragmentParaEnd;
  public isSpace: boolean = false;
  constructor(frag: FragmentParaEnd, x: number, y: number) {
    super(frag, x, y);
    this.height = this.calHeight();
  }

  /**
   * 绘制 paraend 的方法，这是个空方法，paraend 不需要绘制
   */
  public draw(): void {
    // para end 不需要绘制内容
  }
  /**
   * 计算当前 paraend 高度
   */
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size];
  }
  /**
   * 计算当前 paraend 宽度
   */
  public calWidth(): number {
    return 5;
  }

  public getDocumentPos(x: number, y: number, tryHead?: boolean): Partial<IDocumentPos> {
    let textHeight = this.height;
    let PosYText = 0;
    if (this.prevSibling !== null) {
      textHeight = this.prevSibling.height;
      PosYText = this.prevSibling.y - this.y;
    }

    return {
      index: 0,
      textHeight,
      PosX: 0,
      PosYText,
    }
  }
}
