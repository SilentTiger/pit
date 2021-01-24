import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes'
import ILayoutFrameAttributes from './LayoutFrameAttributes'
import IListItemAttributes from './ListItemAttributes'

export type IFormatAttributes = Partial<IListItemAttributes & IFragmentOverwriteAttributes & ILayoutFrameAttributes>
