import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import { IFormatAttributes } from './FormatAttributes'
import Fragment from './Fragment'
import IFragmentImageAttributes, { FragmentImageDefaultAttributes } from './FragmentImageAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'

export default class FragmentImage extends Fragment {
  public static readonly fragType: string = 'img'
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentImageAttributes = FragmentImageDefaultAttributes;
  public content: string = '';
  public readonly length: number = 1;
  public img: HTMLImageElement | null = null;
  public loaded: boolean = false;
  public fail: boolean = false;

  protected defaultAttrs = FragmentImageDefaultAttributes;
  protected originAttrs: Partial<IFragmentImageAttributes> = {};

  public readFromOps(Op: Op): void {
    this.content = Op?.attributes?.gallery
    this.setAttributes(Op.attributes)
    this.calMetrics()
  }

  /**
   * 计算当前 fragment 的尺寸
   */
  public calSize() {
    return {
      height: this.attributes.height,
      width: this.attributes.width,
    }
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics(): void {
    this.metrics = {
      baseline: this.attributes.height,
      bottom: this.attributes.height,
      xTop: 0,
    }
  }

  /**
   * 设置属性
   */
  public setAttributes(attr: any) {
    super.setAttributes(attr)
    if (attr['ori-height'] !== undefined) {
      this.attributes.oriHeight = parseInt(attr['ori-height'], 10)
      this.attributes.height = this.attributes.oriHeight
    }
    if (attr['ori-width'] !== undefined) {
      this.attributes.oriWidth = parseInt(attr['ori-width'], 10)
      this.attributes.width = this.attributes.oriWidth
    }
    if (attr.height !== undefined) {
      this.attributes.height = parseInt(attr.height, 10)
    }
    if (attr.width !== undefined) {
      this.attributes.width = parseInt(attr.width, 10)
    }
  }

  public toOp(): Op {
    return {
      insert: 1,
      attributes: { ...this.originAttrs, gallery: this.content, frag: FragmentImage.fragType },
    }
  }

  public toHtml(): string {
    return `<img src=${this.content}>`
  }

  /**
   * 加载 image，尝试 3 次都不成功就放弃了
   */
  public loadImage(times: number = 0) {
    if (!this.loaded && !this.img) {
      this.img = new Image()
      this.img.onload = () => {
        this.loaded = true
        this.bubbleUp(BubbleMessage.NEED_DRAW, null)
      }
      this.img.onerror = () => {
        if (times < 2) {
          this.img = null
          this.loadImage(times + 1)
        } else {
          this.fail = true
        }
      }
      this.img.src = this.content
    }
  }
}
