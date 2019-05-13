import FragmentImage from '../DocStructure/FragmentImage';
import Run from "./Run";
export default class RunImage extends Run {
    solidHeight: boolean;
    frag: FragmentImage;
    constructor(frag: FragmentImage, x: number, y: number);
    draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    calHeight(): number;
    calWidth(): number;
    getDocumentPos(x: number, y: number, tryHead?: boolean): number;
}
