import IRectangle from "./IRectangle";

export default interface ICanvasContext extends CanvasRenderingContext2D {
  drawCursor(x: number, y: number, height: number, color: string): void;
  drawSelectionArea(rects: IRectangle[], scrollTop: number): void;
}
