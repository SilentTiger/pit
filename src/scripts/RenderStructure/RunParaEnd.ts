import { convertPt2Px } from '../Common/Platform'
import FragmentParaEnd from '../DocStructure/FragmentParaEnd'
import Run from './Run'

export default class RunParaEnd extends Run {
  public frag: FragmentParaEnd;
  public isSpace: boolean = false;
  constructor(frag: FragmentParaEnd, x: number, y: number) {
    super(x, y)
    this.frag = frag
    this.height = this.calHeight()
  }

  /**
   * 绘制 paraEnd 的方法，这是个空方法，paraEnd 不需要绘制
   */
  public draw(): void {
    // para end 不需要绘制内容
  }
  /**
   * 计算当前 paraEnd 高度
   */
  public calHeight(): number {
    return convertPt2Px[this.frag.attributes.size]
  }
  /**
   * 计算当前 paraEnd 宽度
   */
  public calWidth(): number {
    return 5
  }

  public getDocumentPos(x: number, y: number, tryHead?: boolean): number {
    return 0
  }
}
