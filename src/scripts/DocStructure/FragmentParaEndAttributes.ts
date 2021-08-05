import type IFragmentAttributes from './FragmentAttributes';
import { FragmentDefaultAttributes } from './FragmentAttributes'

export default interface IFragmentParaEndAttributes extends IFragmentAttributes {
  size: number
}

const fragmentParaEndDefaultAttributes: IFragmentParaEndAttributes = {
  ...FragmentDefaultAttributes,
  size: 11,
}

export { fragmentParaEndDefaultAttributes as FragmentParaEndDefaultAttributes }
