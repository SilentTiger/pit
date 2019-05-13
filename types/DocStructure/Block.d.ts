import Delta from "quill-delta";
import ICanvasContext from "../Common/ICanvasContext";
import IExportable from "../Common/IExportable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import Document from './Document';
import LayoutFrame from "./LayoutFrame";
export default abstract class Block extends LinkedList<LayoutFrame> implements ILinkedListNode, IExportable {
    prevSibling: this | null;
    nextSibling: this | null;
    parent: Document | null;
    start: number;
    length: number;
    x: number;
    y: number;
    width: number;
    height: number;
    needLayout: boolean;
    destroy(): void;
    /**
     * 排版并绘制当前 block 到 canvas
     * @param ctx canvas 上下文
     * @returns 绘制过程中当前 block 高度是否发生变化
     */
    draw(ctx: ICanvasContext, scrollTop: number): void;
    /**
     * 重新排版当前 block，并返回区块高度是否发生变化
     * @returns 排版过程中当前 block 高度是否发生变化
     */
    abstract layout(): void;
    /**
     * 获取指定坐标在文档中的逻辑位置信息
     * 包含该位置在文档中的 index 信息
     * @param x x 坐标
     * @param y y 坐标
     */
    abstract getDocumentPos(x: number, y: number): number;
    /**
     * 设置当前 block 的 y 轴位置
     * @param pos 位置信息对象
     */
    setPositionY(y: number, recursive?: boolean, force?: boolean): void;
    setStart(index: number, recursive?: boolean, force?: boolean): void;
    setSize(size: {
        height?: number;
        width?: number;
    }): void;
    delete(index: number, length: number): void;
    /**
     * 在 QuoteBlock 里面找到设计到 range 范围的 layout frame
     * @param index range 的开始位置
     * @param length range 的长度
     */
    findLayoutFramesByRange(index: number, length: number): LayoutFrame[];
    isHungry(): boolean;
    /**
     * 吃掉指定的 block
     * @param block 目标 block
     * @return true: 需要删除目标 block
     */
    eat(block: Block): boolean;
    /**
     * 根据选区获取选区矩形区域
     * @param index 选区其实位置
     * @param length 选区长度
     */
    abstract getSelectionRectangles(index: number, length: number): IRectangle[];
    abstract toDelta(): Delta;
    abstract toHtml(): string;
    /**
     * 绘制当前 block
     * @param ctx canvas 上下文
     */
    protected abstract render(ctx: ICanvasContext, scrollTop: number): void;
    private mergeFrame;
    private calLength;
}
