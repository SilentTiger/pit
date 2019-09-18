import { EnumFont, EnumTitle } from "./EnumTextStyle";
import IFragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default interface IFragmentTextAttributes extends IFragmentAttributes {
  title: EnumTitle;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  link: string;
  composing: boolean;
}

const fragmentTextDefaultAttributes: IFragmentTextAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.get('Default'),
  italic: false,
  link: '',
  size: 11,
  title: EnumTitle.Text,
  composing: false,
};

export { fragmentTextDefaultAttributes as FragmentTextDefaultAttributes };
