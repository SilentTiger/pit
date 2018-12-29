import { EnumAlign } from "./EnumParagraphStyle";

export default class ParagraphAttributes {
  public align: EnumAlign;
  public linespacing: number;
}

const ParagraphDefaultAttributes = {
  align: EnumAlign.left,
  linespacing: 1,
};

export { ParagraphDefaultAttributes };
