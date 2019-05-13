import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import Fragment from "./Fragment";
import IFragmentTextAttributes from "./FragmentTextAttributes";
export default class FragmentText extends Fragment {
    metrics: IFragmentMetrics;
    attributes: IFragmentTextAttributes;
    content: string;
    constructor(op: Op, attr: IFragmentTextAttributes, content: string);
    readonly length: number;
    calSize: () => {
        width: number;
        height: number;
    };
    /**
     * 计算当前 fragment 的 metrics
     */
    calMetrics(): void;
    toDelta(): Delta;
    toHtml(): string;
    delete(index: number, length: number): void;
}
