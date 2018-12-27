import { EnumLayout } from "./EnumImageStyle";
import FragmentAttributes from "./FragmentAttributes";

export default class FragmentImageAttributes extends FragmentAttributes {
  public width: number;
  public height: number;
  public src: string;
  public layout: EnumLayout;
  public margin: number;
}
