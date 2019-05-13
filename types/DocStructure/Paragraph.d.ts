import Delta from 'quill-delta';
import ICanvasContext from '../Common/ICanvasContext';
import IRectangle from '../Common/IRectangle';
import Block from './Block';
import LayoutFrame from './LayoutFrame';
export default class Paragraph extends Block {
    readonly id: string;
    private maxWidth;
    constructor(frame: LayoutFrame, maxWidth: number);
    layout(): void;
    getDocumentPos(x: number, y: number): number;
    getSelectionRectangles(index: number, length: number): IRectangle[];
    delete(index: number, length: number): void;
    toDelta(): Delta;
    toHtml(): string;
    protected render(ctx: ICanvasContext, scrollTop: number): void;
}
