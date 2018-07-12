import { EnumFont, EnumTitle } from "./EnumTextStyle";
import FragmentAttributes from "./FragmentAttributes";

export default class FragmentTextAttributes extends FragmentAttributes {
  public content: string;

  public title: EnumTitle;
  public font: EnumFont;
  public size: number;
  public bold: boolean;
  public italic: boolean;
  public underline: boolean;
  public strikeline: boolean;
  public color: string;
  public background: string;
}
