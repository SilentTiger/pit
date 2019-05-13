import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IRectangle from "../Common/IRectangle";
import Block from "./Block";
import LayoutFrame from "./LayoutFrame";
export default class QuoteBlock extends Block {
    private padding;
    constructor(frames: LayoutFrame[]);
    layout(): void;
    getDocumentPos(x: number, y: number): number;
    getSelectionRectangles(index: number, length: number): IRectangle[];
    toDelta(): Delta;
    toHtml(): string;
    remove(target: LayoutFrame): void;
    protected render(ctx: ICanvasContext, scrollTop: number): void;
    private setFrameStart;
}
