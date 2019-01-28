import { EnumFont, EnumTitle } from "./EnumTextStyle";
import FragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default class FragmentTextAttributes extends FragmentAttributes {
  public title: EnumTitle;
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public italic: boolean;
  public link: string;
  public blockquote: boolean;
  public letterSpacing: number;
}

const FragmentTextDefaultAttributes: FragmentTextAttributes = {
  ...FragmentDefaultAttributes,
  blockquote: false,
  bold: false,
  font: EnumFont.Default,
  italic: false,
  letterSpacing: 0,    // 目前使用 canvas.fillText 方案绘制文本，无法完美支持 letterSpacing，所以设置这个值没效果
  link: '',
  size: 11,
  title: EnumTitle.Text,
};

export { FragmentTextDefaultAttributes };
