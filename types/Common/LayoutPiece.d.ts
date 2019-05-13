import Fragment from "../DocStructure/Fragment";
export default class LayoutPiece {
    frags: Array<{
        start: number;
        end: number;
        frag: Fragment;
    }>;
    isSpace: boolean;
    text: string;
    totalWidth: number;
    fragWidth: number[];
    isHolder: boolean;
    constructor(isHolder: boolean);
    calTotalWidth(): void;
    calFragWidth(): void;
    calCharWidthByFrag(fragIndex: number): number[];
}
