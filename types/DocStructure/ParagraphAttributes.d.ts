import { EnumAlign } from "./EnumParagraphStyle";
export default interface ILayoutFrameAttributes {
    align: EnumAlign;
    linespacing: number;
    indent: number;
}
declare const layoutFrameDefaultAttributes: ILayoutFrameAttributes;
export { layoutFrameDefaultAttributes as LayoutFrameDefaultAttributes };
