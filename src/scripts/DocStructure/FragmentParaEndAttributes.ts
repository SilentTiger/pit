import FragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default class FragmentParaEndAttributes extends FragmentAttributes {
  public size: number;
}

const FragmentParaEndDefaultAttributes: FragmentParaEndAttributes = {
  ...FragmentDefaultAttributes,
  size: 11,
};

export { FragmentParaEndDefaultAttributes };
