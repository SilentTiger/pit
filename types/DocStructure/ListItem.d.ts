import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import Block from "./Block";
import LayoutFrame from "./LayoutFrame";
import IListItemAttributes from "./ListItemAttributes";
export default class ListItem extends Block {
    attributes: IListItemAttributes;
    titleContent: string;
    titleWidth: number;
    titleBaseline: number;
    titleIndex: number;
    titleParent: string;
    constructor(frames: LayoutFrame[], attrs: any, maxWidth: number);
    layout(): void;
    render(ctx: ICanvasContext, scrollTop: number): void;
    setAttributes(attrs: any): void;
    setTitleContent(titleContent: string): void;
    getDocumentPos(x: number, y: number): number;
    getSelectionRectangles(index: number, length: number): IRectangle[];
    toDelta(): Delta;
    toHtml(): string;
    private setTitleIndex;
}
