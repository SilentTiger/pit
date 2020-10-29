import FragmentParaEnd from '../DocStructure/FragmentParaEnd'
import Run from './Run'
import { DocPos } from '../Common/DocPos'
import { getPlatform } from '../Platform'

export default class RunParaEnd extends Run {
  public frag: FragmentParaEnd
  public isSpace: boolean = true;
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
    this.height = getPlatform().convertPt2Px[this.frag.attributes.size]
    return this.height
  }
  /**
   * 计算当前 paraEnd 宽度
   */
  public calWidth(): number {
    this.width = 5
    return this.width
  }

  public getDocumentPos(x: number, y: number, start: boolean): DocPos {
    return { index: 0, inner: null }
  }
}
