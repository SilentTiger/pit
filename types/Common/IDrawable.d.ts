export interface IDrawable {
    /**
     * 绘制当前实例
     * @param x 当前实例父容器左上角的 x 坐标
     * @param y 当前实例父容器左上角的 y 坐标
     */
    draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}
