import type IFragmentAttributes from './FragmentAttributes'
import type IFragmentDateAttributes from './FragmentDateAttributes'
import type IFragmentImageAttributes from './FragmentImageAttributes'
import type IFragmentParaEndAttributes from './FragmentParaEndAttributes'
import type IFragmentTextAttributes from './FragmentTextAttributes'

export type IFragmentOverwriteAttributes = Partial<
  IFragmentAttributes &
    IFragmentDateAttributes &
    IFragmentImageAttributes &
    IFragmentParaEndAttributes &
    IFragmentTextAttributes
>
