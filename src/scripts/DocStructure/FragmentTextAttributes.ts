import { EnumAlign, EnumFont, EnumTitle } from "./EnumTextStyle";
import FragmentAttributes from "./FragmentAttributes";

export default class FragmentTextAttributes extends FragmentAttributes {
  public align: EnumAlign;
  public title: EnumTitle;
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public italic: boolean;
  public underline: boolean;
  public strikeline: boolean;
  public color: string;
  public linespacing: number;
  public background: string;
  public link: string;
  public blockquote: boolean;
}
