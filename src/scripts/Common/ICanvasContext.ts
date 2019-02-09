export default interface ICanvasContext extends CanvasRenderingContext2D {
  drawCursor(x: number, y: number, height: number, color: string): void;
}
