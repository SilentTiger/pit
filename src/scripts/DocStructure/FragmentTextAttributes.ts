import { EnumFont, EnumTitle } from "./EnumTextStyle";
import FragmentAttributes from "./FragmentAttributes";

export default class FragmentTextAttributes extends FragmentAttributes {
  public title: EnumTitle;
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public italic: boolean;
  public underline: boolean;
  public strikeline: boolean;
  public color: string;
  public background: string;
  public link: string;
  public blockquote: boolean;
}

const FragmentTextDefaultAttributes = {
  background: '#ffffff',
  blockquote: false,
  bold: false,
  color: '#000000',
  font: EnumFont.Default,
  italic: false,
  link: '',
  size: 12,
  strikeline: false,
  title: EnumTitle.Text,
  underline: false,
};

export { FragmentTextDefaultAttributes };
