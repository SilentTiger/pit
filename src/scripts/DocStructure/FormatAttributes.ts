import type { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import type ILayoutFrameAttributes from './LayoutFrameAttributes'
import type IListItemAttributes from './ListItemAttributes'

export type IFormatAttributes = Partial<IListItemAttributes & IFragmentOverwriteAttributes & ILayoutFrameAttributes>
