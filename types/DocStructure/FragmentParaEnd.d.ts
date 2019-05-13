import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import Fragment from './Fragment';
import IFragmentParaEndAttributes from './FragmentParaEndAttributes';
export default class FragmentParaEnd extends Fragment {
    metrics: IFragmentMetrics;
    attributes: IFragmentParaEndAttributes;
    readonly length = 1;
    constructor(op: Op);
    calSize: () => {
        height: number;
        width: number;
    };
    /**
     * 计算当前 fragment 的 metrics
     */
    calMetrics(): void;
    toDelta(): Delta;
    toHtml(): string;
}
