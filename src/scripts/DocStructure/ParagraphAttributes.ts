import { EnumAlign } from "./EnumParagraphStyle";

export default class ParagraphAttributes {
  public align: EnumAlign;
  public linespacing: number;
  public indent: number;
}

const ParagraphDefaultAttributes: ParagraphAttributes = {
  align: EnumAlign.justify,
  indent: 0,
  linespacing: 1,
};

export { ParagraphDefaultAttributes };
