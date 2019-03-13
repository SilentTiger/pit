import { EnumFont } from "./EnumTextStyle";
import IFragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default interface IFragmentDateAttributes extends IFragmentAttributes {
  font: EnumFont;
  size: number;
  bold: boolean;
  italic: boolean;
}

const FragmentDateDefaultAttributes: IFragmentDateAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.Default,
  italic: false,
  size: 11,
};

export { FragmentDateDefaultAttributes };
