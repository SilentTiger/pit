import Fragment from "./Fragment";
import FragmentImageAttributes, { FragmentImageDefaultAttributes } from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public attributes: FragmentImageAttributes = {
    ...FragmentImageDefaultAttributes,
  };
  public content: string;
  public readonly length: number = 1;
  public readonly img: HTMLImageElement = new Image();
  constructor(src: string, attr?: FragmentImageAttributes) {
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

  public calMetrics(): void {
    this.metrics = {
      baseline: this.attributes.height,
      bottom: this.attributes.height,
      emBottom: this.attributes.height,
      emTop: 0,
    };
  }

  protected setAttributes(attr: any) {
    super.setAttributes(attr);
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

  private setImage() {
    this.img.src = this.content;
  }
}
