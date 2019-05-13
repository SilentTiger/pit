import FragmentParaEnd from '../DocStructure/FragmentParaEnd';
import Run from "./Run";
export default class RunParaEnd extends Run {
    frag: FragmentParaEnd;
    isSpace: boolean;
    constructor(frag: FragmentParaEnd, x: number, y: number);
    /**
     * 绘制 paraEnd 的方法，这是个空方法，paraEnd 不需要绘制
     */
    draw(): void;
    /**
     * 计算当前 paraEnd 高度
     */
    calHeight(): number;
    /**
     * 计算当前 paraEnd 宽度
     */
    calWidth(): number;
    getDocumentPos(x: number, y: number, tryHead?: boolean): number;
}
