import { EnumLayout } from './EnumImageStyle'
import IFragmentAttributes, { FragmentDefaultAttributes } from './FragmentAttributes'

export default interface IFragmentImageAttributes extends IFragmentAttributes {
  width: number
  height: number
  layout: EnumLayout
  margin: number
  oriHeight: number
  oriWidth: number
}

const fragmentImageDefaultAttributes: IFragmentImageAttributes = {
  ...FragmentDefaultAttributes,
  height: 0,
  layout: EnumLayout.block,
  margin: 0,
  oriHeight: 0,
  oriWidth: 0,
  width: 0,
}

export { fragmentImageDefaultAttributes as FragmentImageDefaultAttributes }
