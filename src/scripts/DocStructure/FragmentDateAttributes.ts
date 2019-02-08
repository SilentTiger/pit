import { EnumFont } from "./EnumTextStyle";
import FragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default class FragmentDateAttributes extends FragmentAttributes {
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public italic: boolean;
}

const FragmentDateDefaultAttributes: FragmentDateAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.Default,
  italic: false,
  size: 11,
};

export { FragmentDateDefaultAttributes };
