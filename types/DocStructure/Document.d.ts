import * as EventEmitter from 'eventemitter3';
import Delta from 'quill-delta';
import ICanvasContext from '../Common/ICanvasContext';
import IExportable from '../Common/IExportable';
import IRange from '../Common/IRange';
import IRectangle from '../Common/IRectangle';
import { LinkedList } from '../Common/LinkedList';
import Block from './Block';
export declare enum EnumBlockType {
    Paragraph = "Paragraph",
    QuoteBlock = "QuoteBlock",
    CodeBlock = "CodeBlock",
    Divide = "Divide",
    ListItem = "ListItem",
    Location = "Location",
    Attachment = "Attachment",
    Table = "Table"
}
export default class Document extends LinkedList<Block> implements IExportable {
    readonly selection: IRange | null;
    em: EventEmitter;
    width: number;
    height: number;
    length: number;
    readonly children: Block[];
    selectionRectangles: IRectangle[];
    delta: Delta;
    private initLayout;
    private idleLayoutQueue;
    private idleLayoutRunning;
    private startDrawingBlock;
    private endDrawingBlock;
    private _selection;
    private historyStack;
    private historyCursor;
    readFromChanges: (delta: Delta) => void;
    applyChanges: (delta: Delta, pushHistory?: boolean) => void;
    /**
     * 清除当前文档中的所有数据
     */
    clear(): void;
    draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number, force?: boolean): void;
    getLength(): number;
    destroy(): void;
    setSize(size: {
        height?: number;
        width?: number;
    }): void;
    getDocumentPos: (x: number, y: number) => number;
    /**
     * 设置文档选区
     * @param index 位置索引
     * @param length 选区长度
     */
    setSelection(index: number, length: number): boolean;
    toDelta(): Delta;
    toHtml(): string;
    /**
     * 添加一条操作
     */
    pushHistory(redo: Delta, undo: Delta): void;
    /**
     * 获取重做下一步操作的 delta
     */
    redo(): void;
    /**
     * 获取撤销上一步操作的 delta
     */
    undo(): void;
    /**
     * 根据远端的 change 来 rebase stack 中所有操作
     * @param change 远端的 change
     */
    rebase(change: Delta): void;
    /**
     * 删除操作
     * @param forward true: 向前删除，相当于退格键； false：向后删除，相当于 win 上的 del 键
     */
    delete(forward?: boolean): void;
    /**
     * 在 document 里面找到设计到 range 范围的 block
     * @param index range 的开始位置
     * @param length range 的长度
     */
    private findBlocksByRange;
    private findChildrenInPos;
    /**
     * 计算某条 change 数据对应的 block type，null 表示普通行内数据
     * @param op 结构化的 delta 数据
     */
    private getBlockTypeFromOp;
    /**
     * 根据 change 信息生成 fragment
     */
    private getFragmentFromOp;
    private startIdleLayout;
    private runIdleLayout;
    private calSelectionRectangles;
    private markListItemToLayout;
}
