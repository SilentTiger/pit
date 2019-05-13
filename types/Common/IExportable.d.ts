import Delta from "quill-delta";
export default interface IExportable {
    /**
     * 导出为 Delta
     */
    toDelta(): Delta;
    /**
     * 导出为 HTML
     */
    toHtml(): string;
}
