import * as EventEmitter from 'eventemitter3';
import Delta from 'quill-delta';
import IRange from './Common/IRange';
import { EditorConfig } from "./IEditorConfig";
/**
 * 编辑器类
 */
export default class Editor {
    em: EventEmitter<string | symbol>;
    scrollTop: number;
    private cvsOffsetX;
    /**
     * 编辑器容器 DOM 元素
     */
    private container;
    private heightPlaceholder;
    private selectionStart;
    private divCursor;
    private textInput;
    /**
     * 编辑器画布 DOM 元素
     */
    private cvsDoc;
    private cvsCover;
    /**
     * 编辑器画布 context 对象
     */
    private ctx;
    private doc;
    private rendering;
    private needRender;
    private setEditorHeight;
    private changeCursorStatus;
    /**
     * 编辑器构造函数
     * @param container 编辑器容器 DOM 元素
     * @param config 编辑器配置数据实例
     */
    constructor(container: HTMLDivElement, config: EditorConfig);
    /**
     * 通过 delta 初始化文档内容
     * @param delta change 数组
     */
    readFromChanges(delta: Delta): void;
    setSelection(index: number, length: number): void;
    getSelection(): IRange | null;
    /**
     * 清除文档内容
     */
    clearData(): void;
    scrollTo(): void;
    private bindReadEvents;
    private bindEditEvents;
    /**
     * 初始化编辑器 DOM 结构
     */
    private initDOM;
    /**
     * 绘制文档内容
     */
    private render;
    /**
     * 开始绘制任务
     */
    private startDrawing;
    private onEditorScroll;
    private onMouseDown;
    private onMouseMove;
    private onMouseUp;
    private calOffsetDocPos;
    private onDocumentSelectionChange;
    private onDocumentContentChange;
    private onBackSpace;
}
