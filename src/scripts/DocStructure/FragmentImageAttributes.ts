import { EnumLayout } from "./EnumImageStyle";
import FragmentAttributes from "./FragmentAttributes";

export default class FragmentImageAttributes extends FragmentAttributes {
  public width: number;
  public height: number;
  public layout: EnumLayout;
  public margin: number;
}

const FragmentImageDefaultAttributes = {
  height: 0,
  layout: EnumLayout.block,
  margin: 0,
  width: 0,
};

export { FragmentImageDefaultAttributes };
