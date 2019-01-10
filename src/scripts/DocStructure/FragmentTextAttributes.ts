import { EnumFont, EnumTitle } from "./EnumTextStyle";
import FragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default class FragmentTextAttributes extends FragmentAttributes {
  public title: EnumTitle;
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public italic: boolean;
  public underline: boolean;
  public strike: boolean;
  public color: string;
  public background: string;
  public link: string;
  public blockquote: boolean;
  public letterSpacing: number;
}

const FragmentTextDefaultAttributes: FragmentTextAttributes = {
  ...FragmentDefaultAttributes,
  background: '#ffffff',
  blockquote: false,
  bold: false,
  color: '#000000',
  font: EnumFont.Default,
  italic: false,
  letterSpacing: 0,    // 目前使用 canvas.fillText 方案绘制文本，无法完美支持 letterSpacing，所以设置这个值没效果
  link: '',
  size: 12,
  strike: false,
  title: EnumTitle.Text,
  underline: false,
};

export { FragmentTextDefaultAttributes };
