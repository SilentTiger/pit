/**
 * 编辑器配置数据结构
 */
// export interface IEditorConfig {
//   containerWidth: number;    // 编辑器容器宽度
//   containerHeight: number;   // 编辑器容器高度
// }

export class EditorConfig {
  public containerWidth: number = 650;
  public containerHeight: number = 700;
  public canvasWidth: number = 616;
  public canCopy: boolean = true;
  public canEdit: boolean = true;
}

export default new EditorConfig()
