import { EnumFont, EnumTitle } from "./EnumTextStyle";
import IFragmentAttributes from "./FragmentAttributes";
export default interface IFragmentTextAttributes extends IFragmentAttributes {
    title: EnumTitle;
    font: EnumFont;
    size: number;
    bold: boolean;
    italic: boolean;
    link: string;
}
declare const fragmentTextDefaultAttributes: IFragmentTextAttributes;
export { fragmentTextDefaultAttributes as FragmentTextDefaultAttributes };
