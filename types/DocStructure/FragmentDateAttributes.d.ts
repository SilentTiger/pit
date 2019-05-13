import { EnumFont } from "./EnumTextStyle";
import IFragmentAttributes from "./FragmentAttributes";
export default interface IFragmentDateAttributes extends IFragmentAttributes {
    font: EnumFont;
    size: number;
    bold: boolean;
    italic: boolean;
}
declare const fragmentDateDefaultAttributes: IFragmentDateAttributes;
export { fragmentDateDefaultAttributes as FragmentDateDefaultAttributes };
