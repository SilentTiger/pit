import FragmentDate from '../DocStructure/FragmentDate';
import Run from "./Run";
export default class RunDate extends Run {
    frag: FragmentDate;
    content: string;
    isSpace: boolean;
    constructor(frag: FragmentDate, x: number, y: number, textContent?: string);
    /**
     *  绘制 RunDate
     * @param ctx 绘图 api 接口
     */
    draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    /**
     * 计算当前 RunDate 高度
     */
    calHeight(): number;
    /**
     * 计算当前 RunDate 宽度
     */
    calWidth(): number;
    getDocumentPos(x: number, y: number, tryHead?: boolean): number;
}
