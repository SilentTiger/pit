import { EnumLayout } from "./EnumImageStyle";
import IFragmentAttributes from "./FragmentAttributes";
export default interface IFragmentImageAttributes extends IFragmentAttributes {
    width: number;
    height: number;
    layout: EnumLayout;
    margin: number;
    oriHeight: number;
    oriWidth: number;
}
declare const fragmentImageDefaultAttributes: IFragmentImageAttributes;
export { fragmentImageDefaultAttributes as FragmentImageDefaultAttributes };
