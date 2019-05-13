import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import IExportable from '../Common/IExportable';
import { IFragmentMetrics } from '../Common/IFragmentMetrics';
import { ILinkedListNode } from '../Common/LinkedList';
import IFragmentAttributes from './FragmentAttributes';
import LayoutFrame from './LayoutFrame';
export default abstract class Fragment implements ILinkedListNode, IExportable {
    readonly start: number;
    prevSibling: this | null;
    nextSibling: this | null;
    parent: LayoutFrame | null;
    delta: Delta;
    abstract attributes: IFragmentAttributes;
    abstract metrics: IFragmentMetrics;
    readonly id: string;
    abstract readonly length: number;
    constructor(op: Op);
    destroy(): void;
    /**
     * 计算当前 fragment 的宽度和高度
     */
    abstract calSize(): {
        height: number;
        width: number;
    };
    /**
     * 计算当前 fragment 的 metrics
     */
    abstract calMetrics(): void;
    abstract toDelta(): Delta;
    abstract toHtml(): string;
    delete(index: number, length: number): void;
    setAttributes(attrs: any): void;
}
