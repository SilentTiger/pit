import Op from 'quill-delta-enhanced/dist/Op'
import { IFragmentMetrics } from '../Common/IFragmentMetrics'
import Fragment from './Fragment'
import IFragmentImageAttributes, { FragmentImageDefaultAttributes } from './FragmentImageAttributes'
import { BubbleMessage } from '../Common/EnumBubbleMessage'
import { convertFragmentAttributesToCssStyleText } from '../Common/util'

export default class FragmentImage extends Fragment {
  public static readonly fragType: string = 'img'
  public metrics!: IFragmentMetrics
  public content = ''
  public img: HTMLImageElement | null = null
  public loaded = false
  public fail = false

  public defaultAttributes: IFragmentImageAttributes = FragmentImageDefaultAttributes
  public originalAttributes: Partial<IFragmentImageAttributes> | null = null
  public attributes: IFragmentImageAttributes = { ...FragmentImageDefaultAttributes }

  public readFromOps(Op: Op): void {
    this.content = Op?.attributes?.gallery

    const attr = Op.attributes!
    if (attr['ori-height'] !== undefined) {
      attr.oriHeight = parseInt(attr['ori-height'], 10)
      attr.height = attr.oriHeight
    }
    if (attr['ori-width'] !== undefined) {
      attr.oriWidth = parseInt(attr['ori-width'], 10)
      attr.width = attr.oriWidth
    }
    if (attr.height !== undefined) {
      attr.height = parseInt(attr.height, 10)
    }
    if (attr.width !== undefined) {
      attr.width = parseInt(attr.width, 10)
    }
    this.setAttributes(attr)
    this.calMetrics()
  }

  /**
   * 计算当前 fragment 的尺寸
   */
  public calTotalWidth() {
    return this.attributes.width
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

  public toOp(withKey: boolean): Op {
    const oriHeightOpValue = this.originalAttributes?.hasOwnProperty('oriHeight')
      ? { 'ori-height': this.originalAttributes.oriHeight }
      : null
    const oriWidthOpValue = this.originalAttributes?.hasOwnProperty('oriWidth')
      ? { 'ori-width': this.originalAttributes.oriWidth }
      : null
    const op: Op = {
      insert: 1,
      attributes: {
        ...this.originalAttributes,
        gallery: this.content,
        frag: FragmentImage.fragType,
        ...oriHeightOpValue,
        ...oriWidthOpValue,
      },
    }
    if (withKey) {
      op.key = this.id
    }
    return op
  }

  public toHtml(): string {
    return `<img style=${convertFragmentAttributesToCssStyleText(this.attributes)} src="${this.content}"/>`
  }

  public toText(): string {
    return ''
  }

  /**
   * 加载 image，尝试 3 次都不成功就放弃了
   */
  public loadImage(times = 0) {
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

  public compileAttributes() {
    super.compileAttributes()
    this.calMetrics()
  }
}
