import IFragmentAttributes from "./FragmentAttributes";
import IFragmentDateAttributes from "./FragmentDateAttributes";
import IFragmentImageAttributes from "./FragmentImageAttributes";
import IFragmentParaEndAttributes from "./FragmentParaEndAttributes";
import IFragmentTextAttributes from "./FragmentTextAttributes";

export type IFragmentOverwriteAttributes =
  Partial<IFragmentAttributes &
    IFragmentDateAttributes &
    IFragmentImageAttributes &
    IFragmentParaEndAttributes &
    IFragmentTextAttributes>;
