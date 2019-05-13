import FragmentText from '../DocStructure/FragmentText';
import Run from "./Run";
export default class RunText extends Run {
    frag: FragmentText;
    content: string;
    isSpace: boolean;
    constructor(frag: FragmentText, x: number, y: number, textContent?: string);
    draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    calHeight(): number;
    calWidth(): number;
    getDocumentPos(x: number, y: number, tryHead?: boolean): number;
    getCoordinatePosX(index: number): number;
}
