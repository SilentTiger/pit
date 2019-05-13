import Delta from "quill-delta";
import Op from "quill-delta/dist/Op";
import { IFragmentMetrics } from "../Common/IFragmentMetrics";
import Fragment from "./Fragment";
import IFragmentImageAttributes from "./FragmentImageAttributes";
export default class FragmentImage extends Fragment {
    metrics: IFragmentMetrics;
    attributes: IFragmentImageAttributes;
    content: string;
    readonly length: number;
    readonly img: HTMLImageElement;
    protected defaultAttributes: IFragmentImageAttributes;
    constructor(op: Op, attr: IFragmentImageAttributes, src: string);
    calSize: () => {
        height: number;
        width: number;
    };
    /**
     * 计算当前 fragment 的 metrics
     */
    calMetrics(): void;
    setAttributes(attr: any): void;
    toDelta(): Delta;
    toHtml(): string;
    /**
     * 设置图像 src
     */
    private setImage;
}
