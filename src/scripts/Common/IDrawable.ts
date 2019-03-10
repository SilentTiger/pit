export interface IDrawable {
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}
