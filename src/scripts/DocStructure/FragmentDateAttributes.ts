import { EnumFont } from './EnumTextStyle'
import IFragmentAttributes, { FragmentDefaultAttributes } from './FragmentAttributes'

export default interface IFragmentDateAttributes extends IFragmentAttributes {
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
}

const fragmentDateDefaultAttributes: IFragmentDateAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.get('Default')!,
  italic: false,
  size: 11,
}

export { fragmentDateDefaultAttributes as FragmentDateDefaultAttributes }
