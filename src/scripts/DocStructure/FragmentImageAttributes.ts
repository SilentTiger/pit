import type IFragmentAttributes from './FragmentAttributes'
import { FragmentDefaultAttributes } from './FragmentAttributes'

export default interface IFragmentImageAttributes extends IFragmentAttributes {
  width: number
  height: number
  margin: number
  oriHeight: number
  oriWidth: number
  src: string
}

const fragmentImageDefaultAttributes: IFragmentImageAttributes = {
  ...FragmentDefaultAttributes,
  height: 0,
  margin: 0,
  oriHeight: 0,
  oriWidth: 0,
  width: 0,
  src: '',
}

export { fragmentImageDefaultAttributes as FragmentImageDefaultAttributes }
