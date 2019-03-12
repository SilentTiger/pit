import IFragmentAttributes from "./FragmentAttributes";
import IFragmentDateAttributes from "./FragmentDateAttributes";
import IFragmentImageAttributes from "./FragmentImageAttributes";
import IFragmentParaEndAttributes from "./FragmentParaEndAttributes";
import IFragmentTextAttributes from "./FragmentTextAttributes";

export interface IFragmentOverwriteAttributes extends
  IFragmentAttributes,
  IFragmentDateAttributes,
  IFragmentImageAttributes,
  IFragmentParaEndAttributes,
  IFragmentTextAttributes {

}
