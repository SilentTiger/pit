import { EnumFont, EnumTitle } from "./EnumTextStyle";
import IFragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default interface IFragmentTextAttributes extends IFragmentAttributes {
  title?: EnumTitle;
  font?: EnumFont;
  size?: number;
  bold?: boolean;
  color?: string;
  italic?: boolean;
  link?: string;
}

const FragmentTextDefaultAttributes: IFragmentTextAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  color: '#494949',
  font: EnumFont.Default,
  italic: false,
  link: '',
  size: 11,
  title: EnumTitle.Text,
};

export { FragmentTextDefaultAttributes };
