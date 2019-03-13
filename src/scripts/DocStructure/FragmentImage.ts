import Fragment from "./Fragment";
import IFragmentImageAttributes, { FragmentImageDefaultAttributes } from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public attributes: IFragmentImageAttributes;
  public content: string;
  public readonly length: number = 1;
  public readonly img: HTMLImageElement = new Image();
  protected defaultAttributes = FragmentImageDefaultAttributes;
  constructor(src: string, attr?: IFragmentImageAttributes) {
    super();
    this.content = src;
    this.setAttributes(attr);
    this.calMetrics();
    this.setImage();
  }

  public calSize = () => {
    return {
      height: this.attributes.height,
      width: this.attributes.width,
    };
  }
  /**
   * 计算当前 fragment 的 metrics
   */
  public calMetrics(): void {
    this.metrics = {
      baseline: this.attributes.height,
      bottom: this.attributes.height,
      emBottom: this.attributes.height,
      emTop: 0,
    };
  }

  public setAttributes(attr: any) {
    super.setAttributes({ownAttributes: attr});
    if (attr['ori-height'] !== undefined) {
      this.attributes.oriHeight = parseInt(attr['ori-height'], 10);
    }
    if (attr['ori-width'] !== undefined) {
      this.attributes.oriWidth = parseInt(attr['ori-width'], 10);
    }
    if (attr.height !== undefined) {
      this.attributes.height = parseInt(attr.height, 10);
    }
    if (attr.width !== undefined) {
      this.attributes.width = parseInt(attr.width, 10);
    }
  }
  /**
   * 设置图像 src
   */
  private setImage() {
    this.img.src = this.content;
  }
}
