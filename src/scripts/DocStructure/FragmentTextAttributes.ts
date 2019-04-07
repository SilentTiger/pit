import { EnumFont, EnumTitle } from "./EnumTextStyle";
import IFragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default interface IFragmentTextAttributes extends IFragmentAttributes {
  title: EnumTitle;
  font: EnumFont;
  size: number;
  bold: boolean;
  italic: boolean;
  link: string;
}

const fragmentTextDefaultAttributes: IFragmentTextAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.Default,
  italic: false,
  link: '',
  size: 11,
  title: EnumTitle.Text,
};

export { fragmentTextDefaultAttributes as FragmentTextDefaultAttributes };
