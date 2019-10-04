import ICanvasContext from "./ICanvasContext";

export interface IDrawable {
  /**
   * 绘制当前实例
   * @param x 当前实例父容器左上角的 x 坐标
   * @param y 当前实例父容器左上角的 y 坐标
   * @param viewHeight 整个画布的高度
   */
  draw: (ctx: ICanvasContext, x: number, y: number, viewHeight: number) => void;
}
