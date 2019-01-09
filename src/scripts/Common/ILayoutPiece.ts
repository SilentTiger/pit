export default interface ILayoutPiece {
  isSpace: boolean;
  text: string;
  width?: number;   // 某些情况下，排版逻辑不依赖于 ILayoutPiece 的宽度，此时可以不设置这个字段
}
