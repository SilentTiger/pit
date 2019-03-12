import IFragmentAttributes, { FragmentDefaultAttributes } from "./FragmentAttributes";

export default interface IFragmentParaEndAttributes extends IFragmentAttributes {
  size?: number;
}

const FragmentParaEndDefaultAttributes: IFragmentParaEndAttributes = {
  ...FragmentDefaultAttributes,
  size: 11,
};

export { FragmentParaEndDefaultAttributes };
