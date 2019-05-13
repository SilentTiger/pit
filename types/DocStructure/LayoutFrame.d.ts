import Delta from 'quill-delta';
import { IDrawable } from "../Common/IDrawable";
import IExportable from '../Common/IExportable';
import IRectangle from "../Common/IRectangle";
import LayoutPiece from "../Common/LayoutPiece";
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import Line from "../RenderStructure/Line";
import Fragment from "./Fragment";
import ILayoutFrameAttributes from "./ParagraphAttributes";
export default class LayoutFrame extends LinkedList<Fragment> implements ILinkedListNode, IRectangle, IDrawable, IExportable {
    prevSibling: this | null;
    nextSibling: this | null;
    parent: LayoutFrame | null;
    start: number;
    length: number;
    x: number;
    y: number;
    width: number;
    height: number;
    maxWidth: number;
    firstIndent: number;
    attributes: ILayoutFrameAttributes;
    lines: Line[];
    readonly id: string;
    private minBaseline;
    private minLineHeight;
    constructor(frags: Fragment[], attrs: any, maxWidth: number);
    destroy(): void;
    addLine(line: Line): void;
    calLineBreakPoint: () => LayoutPiece[];
    draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    setAttributes(attr: any): void;
    layout(): void;
    setMaxWidth(width: number): void;
    setFirstIndent(firstIndent: number): void;
    setMinMetrics(metrics: {
        baseline: number;
        bottom: number;
    }): void;
    getDocumentPos(x: number, y: number): number;
    getSelectionRectangles(index: number, length: number): IRectangle[];
    /**
     * 设置当前 layoutFrame 的 y 轴位置
     * @param pos 位置信息对象
     */
    setPositionY(y: number, recursive?: boolean, force?: boolean): void;
    setStart(index: number, recursive?: boolean, force?: boolean): void;
    toDelta(): Delta;
    toHtml(): string;
    delete(index: number, length: number): void;
    eat(frame: LayoutFrame): void;
    calLength(): void;
    private constructLayoutPieces;
    private getFragsForLayoutPiece;
    private breakLines;
    private setSize;
    private childrenSizeChangeHandler;
    private calSize;
    private setIndex;
    /**
     * 在 LayoutFrame 里面找到设计到 range 范围的 fragment
     * @param index range 的开始位置
     * @param length range 的长度
     */
    private findFragmentsByRange;
}
