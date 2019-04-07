import { EnumAlign } from "./EnumParagraphStyle";

export default class LayoutFrameAttributes {
  public align: EnumAlign;
  public linespacing: number;
  public indent: number;
}

const layoutFrameDefaultAttributes: LayoutFrameAttributes = {
  align: EnumAlign.left,
  indent: 0,
  linespacing: 1.7,
};

export { layoutFrameDefaultAttributes as LayoutFrameDefaultAttributes };
