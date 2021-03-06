import { EnumFont } from './EnumTextStyle'
import IFragmentAttributes, { FragmentDefaultAttributes } from './FragmentAttributes'

export default interface IFragmentTextAttributes extends IFragmentAttributes {
  font: string
  size: number
  bold: boolean
  italic: boolean
  link: string
  composing: boolean
}

const fragmentTextDefaultAttributes: IFragmentTextAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.getFontValue('Default'),
  italic: false,
  link: '',
  size: 11,
  composing: false,
}

export { fragmentTextDefaultAttributes as FragmentTextDefaultAttributes }
