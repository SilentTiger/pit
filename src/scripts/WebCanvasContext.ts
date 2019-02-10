/* tslint:disable:completed-docs*/
/* tslint:disable:max-line-length*/
import ICanvasContext from "./Common/ICanvasContext";

export default class WebCanvasContext implements ICanvasContext {
  //#region 覆盖 CanvasRenderingContext2D 上的属性
  get canvas(): HTMLCanvasElement { return this.ctx.canvas; }
  // set canvas(val: HTMLCanvasElement) {this.ctx.canvas = val;}  // 这是一个 readonly 属性不能设置 setter
  get globalAlpha(): number { return this.ctx.globalAlpha; }
  set globalAlpha(val: number) { this.ctx.globalAlpha = val; }
  get globalCompositeOperation(): string { return this.ctx.globalCompositeOperation; }
  set globalCompositeOperation(val: string) { this.ctx.globalCompositeOperation = val; }
  get imageSmoothingEnabled(): boolean { return this.ctx.imageSmoothingEnabled; }
  set imageSmoothingEnabled(val: boolean) { this.ctx.imageSmoothingEnabled = val; }
  get imageSmoothingQuality(): ImageSmoothingQuality { return this.ctx.imageSmoothingQuality; }
  set imageSmoothingQuality(val: ImageSmoothingQuality) { this.ctx.imageSmoothingQuality = val; }
  get fillStyle(): string | CanvasGradient | CanvasPattern { return this.ctx.fillStyle; }
  set fillStyle(val: string | CanvasGradient | CanvasPattern) { this.ctx.fillStyle = val; }
  get strokeStyle(): string | CanvasGradient | CanvasPattern { return this.ctx.strokeStyle; }
  set strokeStyle(val: string | CanvasGradient | CanvasPattern) { this.ctx.strokeStyle = val; }
  get shadowBlur(): number { return this.ctx.shadowBlur; }
  set shadowBlur(val: number) { this.ctx.shadowBlur = val; }
  get shadowColor(): string { return this.ctx.shadowColor; }
  set shadowColor(val: string) { this.ctx.shadowColor = val; }
  get shadowOffsetX(): number { return this.ctx.shadowOffsetX; }
  set shadowOffsetX(val: number) { this.ctx.shadowOffsetX = val; }
  get shadowOffsetY(): number { return this.ctx.shadowOffsetY; }
  set shadowOffsetY(val: number) { this.ctx.shadowOffsetY = val; }
  get filter(): string { return this.ctx.filter; }
  set filter(val: string) { this.ctx.filter = val; }
  get lineCap(): CanvasLineCap { return this.ctx.lineCap; }
  set lineCap(val: CanvasLineCap) { this.ctx.lineCap = val; }
  get lineDashOffset(): number { return this.ctx.lineDashOffset; }
  set lineDashOffset(val: number) { this.ctx.lineDashOffset = val; }
  get lineJoin(): CanvasLineJoin { return this.ctx.lineJoin; }
  set lineJoin(val: CanvasLineJoin) { this.ctx.lineJoin = val; }
  get lineWidth(): number { return this.ctx.lineWidth; }
  set lineWidth(val: number) { this.ctx.lineWidth = val; }
  get miterLimit(): number { return this.ctx.miterLimit; }
  set miterLimit(val: number) { this.ctx.miterLimit = val; }
  get direction(): CanvasDirection { return this.ctx.direction; }
  set direction(val: CanvasDirection) { this.ctx.direction = val; }
  get font(): string { return this.ctx.font; }
  set font(val: string) { this.ctx.font = val; }
  get textAlign(): CanvasTextAlign { return this.ctx.textAlign; }
  set textAlign(val: CanvasTextAlign) { this.ctx.textAlign = val; }
  get textBaseline(): CanvasTextBaseline { return this.ctx.textBaseline; }
  set textBaseline(val: CanvasTextBaseline) { this.ctx.textBaseline = val; }
  //#endregion

  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }
  public drawCursor(x: number, y: number, height: number, color: string): void {
    console.log('draw cursor at ', x, y);
  }
  public restore(): void {
    return this.ctx.restore.apply(this.ctx, arguments);
  }
  public save(): void {
    return this.ctx.save.apply(this.ctx, arguments);
  }
  public getTransform(): DOMMatrix {
    return this.ctx.getTransform.apply(this.ctx, arguments);
  }
  public resetTransform(): void {
    return this.ctx.resetTransform.apply(this.ctx, arguments);
  }
  public rotate(angle: number): void {
    return this.ctx.rotate.apply(this.ctx, arguments);
  }
  public scale(x: number, y: number): void {
    return this.ctx.scale.apply(this.ctx, arguments);
  }
  public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  public setTransform(transform?: DOMMatrix2DInit): void;
  public setTransform(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
    return this.ctx.setTransform.apply(this.ctx, arguments);
  }
  public transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    return this.ctx.transform.apply(this.ctx, arguments);
  }
  public translate(x: number, y: number): void {
    return this.ctx.translate.apply(this.ctx, arguments);
  }
  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.ctx.createLinearGradient.apply(this.ctx, arguments);
  }
  public createPattern(image: CanvasImageSource, repetition: string): CanvasPattern {
    return this.ctx.createPattern.apply(this.ctx, arguments);
  }
  public createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    return this.ctx.createRadialGradient.apply(this.ctx, arguments);
  }
  public clearRect(x: number, y: number, w: number, h: number): void {
    return this.ctx.clearRect.apply(this.ctx, arguments);
  }
  public fillRect(x: number, y: number, w: number, h: number): void {
    return this.ctx.fillRect.apply(this.ctx, arguments);
  }
  public strokeRect(x: number, y: number, w: number, h: number): void {
    return this.ctx.strokeRect.apply(this.ctx, arguments);
  }
  public beginPath(): void {
    return this.ctx.beginPath.apply(this.ctx, arguments);
  }
  public clip(fillRule?: CanvasFillRule): void;
  public clip(path: Path2D, fillRule?: CanvasFillRule): void;
  public clip(path?: any, fillRule?: any) {
    return this.ctx.clip.apply(this.ctx, arguments);
  }
  public fill(fillRule?: CanvasFillRule): void;
  public fill(path: Path2D, fillRule?: CanvasFillRule): void;
  public fill(path?: any, fillRule?: any) {
    return this.ctx.fill.apply(this.ctx, arguments);
  }
  public isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: any, x: any, y?: any, fillRule?: any) {
    return this.ctx.isPointInPath.apply(this.ctx, arguments);
  }
  public isPointInStroke(x: number, y: number): boolean;
  public isPointInStroke(path: Path2D, x: number, y: number): boolean;
  public isPointInStroke(path: any, x: any, y?: any) {
    return this.ctx.isPointInStroke.apply(this.ctx, arguments);
  }
  public stroke(): void;
  public stroke(path: Path2D): void;
  public stroke(path?: any) {
    return this.ctx.stroke.apply(this.ctx, arguments);
  }
  public drawFocusIfNeeded(element: Element): void;
  public drawFocusIfNeeded(path: Path2D, element: Element): void;
  public drawFocusIfNeeded(path: any, element?: any) {
    return this.ctx.drawFocusIfNeeded.apply(this.ctx, arguments);
  }
  public scrollPathIntoView(): void;
  public scrollPathIntoView(path: Path2D): void;
  public scrollPathIntoView(path?: any) {
    return this.ctx.scrollPathIntoView.apply(this.ctx, arguments);
  }
  public fillText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctx.fillText.apply(this.ctx, arguments);
  }
  public measureText(text: string): TextMetrics {
    return this.ctx.measureText.apply(this.ctx, arguments);
  }
  public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctx.strokeText.apply(this.ctx, arguments);
  }
  public drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  public drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: any, sx: any, sy: any, sw?: any, sh?: any, dx?: any, dy?: any, dw?: any, dh?: any) {
    return this.ctx.drawImage.apply(this.ctx, arguments);
  }
  public createImageData(sw: number, sh: number): ImageData;
  public createImageData(imagedata: ImageData): ImageData;
  public createImageData(sw: any, sh?: any) {
    return this.ctx.createImageData.apply(this.ctx, arguments);
  }
  public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.ctx.getImageData.apply(this.ctx, arguments);
  }
  public putImageData(imagedata: ImageData, dx: number, dy: number): void;
  public putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
  public putImageData(imagedata: any, dx: any, dy: any, dirtyX?: any, dirtyY?: any, dirtyWidth?: any, dirtyHeight?: any) {
    return this.ctx.putImageData.apply(this.ctx, arguments);
  }
  public getLineDash(): number[] {
    return this.ctx.getLineDash.apply(this.ctx, arguments);
  }
  public setLineDash(segments: number[]): void {
    return this.ctx.setLineDash.apply(this.ctx, arguments);
  }
  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctx.arc.apply(this.ctx, arguments);
  }
  public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    return this.ctx.arcTo.apply(this.ctx, arguments);
  }
  public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    return this.ctx.bezierCurveTo.apply(this.ctx, arguments);
  }
  public closePath(): void {
    return this.ctx.closePath.apply(this.ctx, arguments);
  }
  public ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctx.ellipse.apply(this.ctx, arguments);
  }
  public lineTo(x: number, y: number): void {
    return this.ctx.lineTo.apply(this.ctx, arguments);
  }
  public moveTo(x: number, y: number): void {
    return this.ctx.moveTo.apply(this.ctx, arguments);
  }
  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    return this.ctx.quadraticCurveTo.apply(this.ctx, arguments);
  }
  public rect(x: number, y: number, w: number, h: number): void {
    return this.ctx.rect.apply(this.ctx, arguments);
  }
}
