import { EnumFont, EnumTitle } from "./EnumTextStyle";
import FragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default class FragmentTextAttributes extends FragmentAttributes {
  public title: EnumTitle;
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public color: string;
  public italic: boolean;
  public link: string;
}

const FragmentTextDefaultAttributes: FragmentTextAttributes = {
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
