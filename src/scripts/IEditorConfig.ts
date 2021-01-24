/**
 * 编辑器配置数据结构
 */
// export interface IEditorConfig {
//   containerWidth: number;    // 编辑器容器宽度
//   containerHeight: number;   // 编辑器容器高度
// }

export class EditorConfig {
  public containerWidth = 650;
  public containerHeight = 670;
  public canvasWidth = 616;
  public canCopy = true;
  public canEdit = true;
}

export default new EditorConfig()
