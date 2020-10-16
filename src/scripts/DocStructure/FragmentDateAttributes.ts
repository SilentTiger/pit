import { EnumFont } from './EnumTextStyle'
import IFragmentAttributes, { FragmentDefaultAttributes } from './FragmentAttributes'

export enum EnumDateType {
  Date,
  DateTime
}

export default interface IFragmentDateAttributes extends IFragmentAttributes {
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  date: number;
  id: number;
  type: EnumDateType
}

const fragmentDateDefaultAttributes: IFragmentDateAttributes = {
  ...FragmentDefaultAttributes,
  bold: false,
  font: EnumFont.getFontValue('Default'),
  italic: false,
  size: 11,
  date: 0,
  id: 0,
  type: EnumDateType.Date,
}

export { fragmentDateDefaultAttributes as FragmentDateDefaultAttributes }
