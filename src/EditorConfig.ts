/**
 * 编辑器配置数据结构类
 * 用于初始化编辑器实例
 */
export default class EditorConfig {
  /**
   * 编辑器配置数据结构构造函数
   * @param containerWidth 编辑器容器宽度
   * @param containerHeight 编辑器容器高度
   * @param pageWidth 文档每页宽度
   * @param pageHeight 文档每页高度
   */
  constructor(
    public containerWidth: number,
    public containerHeight: number,
    public pageWidth: number,
    public pageHeight: number,
  ) {
  }
}
