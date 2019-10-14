import Delta from "quill-delta";
import Op from "quill-delta/dist/Op";
import { IFragmentMetrics } from "../Common/IFragmentMetrics";
import { IFormatAttributes } from "./FormatAttributes";
import Fragment from "./Fragment";
import IFragmentImageAttributes, { FragmentImageDefaultAttributes } from "./FragmentImageAttributes";

export default class FragmentImage extends Fragment {
  public metrics!: IFragmentMetrics;
  public attributes: IFragmentImageAttributes = FragmentImageDefaultAttributes;
  public content: string;
  public readonly length: number = 1;
  public readonly img: HTMLImageElement = new Image();

  protected defaultAttrs = FragmentImageDefaultAttributes;
  protected originAttrs: Partial<IFragmentImageAttributes> = {};

  constructor(op: Op, attr: Partial<IFragmentImageAttributes>, src: string) {
    super(op);
    this.content = src;
    this.setAttributes(attr);
    this.calMetrics();
  }

  /**
   * 计算当前 fragment 的尺寸
   */
  public calSize() {
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
      xTop: 0,
    };
  }

  /**
   * 设置属性
   */
  public setAttributes(attr: any) {
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

  public toDelta(): Delta {
    throw new Error('not implement');
  }

  public toHtml(): string {
    return `<img src=${this.content}>`;
  }

  public format(attr: IFormatAttributes): void {
    throw new Error("Method not implemented.");
  }

  /**
   * 设置图像 src
   */
  public setImage() {
    this.img.src = this.content;
  }
}
