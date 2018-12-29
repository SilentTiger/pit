import { EnumLayout } from "./EnumImageStyle";
import FragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default class FragmentImageAttributes extends FragmentAttributes {
  public width: number;
  public height: number;
  public layout: EnumLayout;
  public margin: number;
  public oriHeight: number;
  public oriWidth: number;
}

const FragmentImageDefaultAttributes: FragmentImageAttributes = {
  ...FragmentDefaultAttributes,
  height: 0,
  layout: EnumLayout.block,
  margin: 0,
  oriHeight: 0,
  oriWidth: 0,
  width: 0,
};

export { FragmentImageDefaultAttributes };
