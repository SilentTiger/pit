import { EnumAlign } from "./EnumParagraphStyle";

export default class ParagraphAttributes {
  public align: EnumAlign;
  public blockquote: boolean;
  public linespacing: number;
  public indent: number;
}

const ParagraphDefaultAttributes: ParagraphAttributes = {
  align: EnumAlign.left,
  blockquote: false,
  indent: 0,
  linespacing: 1.7,
};

export { ParagraphDefaultAttributes };
