// 包含该位置在文档中的 index 信息、行高、文字高度、颜色、及坐标信息
export default interface IDocumentPos {
  index: number;        // 该位置在文档中的 index 位置
  color: string;        // 该位置的文字颜色
  lineHeight: number;   // 该位置所在行行高
  textHeight: number;   // 该位置所在文字高度
  PosX: number;         // 该位置的 x 坐标
  PosYLine: number;     // 该位置的行 y 坐标
  PosYText: number;     // 该位置的文字 y 坐标
}
