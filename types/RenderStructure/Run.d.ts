import { IDrawable } from "../Common/IDrawable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Fragment from "../DocStructure/Fragment";
import Line from "./Line";
export default abstract class Run implements ILinkedListNode, IRectangle, IDrawable {
    x: number;
    y: number;
    width: number;
    height: number;
    solidHeight: boolean;
    prevSibling: this | null;
    nextSibling: this | null;
    parent: Line | null;
    abstract frag: Fragment;
    length: number;
    constructor(x: number, y: number);
    destroy(): void;
    abstract draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    abstract calHeight(): number;
    abstract calWidth(): number;
    /**
     * 根据坐标获取文档格式信息
     * @param x run 内部 x 坐标
     * @param y run 内部 y 坐标
     * @param tryHead 是否取头部坐标
     */
    abstract getDocumentPos(x: number, y: number, tryHead?: boolean): number;
    setSize: (height: number, width: number) => void;
    calSize: () => {
        height: number;
        width: number;
    };
    setPosition(x: number, y: number): void;
    getCoordinatePosX(index: number): number;
}
