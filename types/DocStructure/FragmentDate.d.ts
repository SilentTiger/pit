import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import Fragment from "./Fragment";
import IFragmentDateAttributes from "./FragmentDateAttributes";
export default class FragmentDate extends Fragment {
    metrics: IFragmentMetrics;
    attributes: IFragmentDateAttributes;
    dateContent: {
        date: number;
        type: "date" | "date-time";
        id: number;
    };
    readonly length = 1;
    readonly stringContent: string;
    protected defaultAttributes: IFragmentDateAttributes;
    constructor(op: Op, attr: IFragmentDateAttributes, content: any);
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
}
