/* tslint:disable:completed-docs*/
/* tslint:disable:max-line-length*/
import ICanvasContext from "./Common/ICanvasContext";
import IRectangle from "./Common/IRectangle";

export default class WebCanvasContext implements ICanvasContext {
  //#region 覆盖 CanvasRenderingContext2D 上的属性
  get canvas(): HTMLCanvasElement { return this.ctxDoc.canvas; }
  // set canvas(val: HTMLCanvasElement) {this.ctx.canvas = val;}  // 这是一个 readonly 属性不能设置 setter
  get globalAlpha(): number { return this.ctxDoc.globalAlpha; }
  set globalAlpha(val: number) { this.ctxDoc.globalAlpha = val; }
  get globalCompositeOperation(): string { return this.ctxDoc.globalCompositeOperation; }
  set globalCompositeOperation(val: string) { this.ctxDoc.globalCompositeOperation = val; }
  get imageSmoothingEnabled(): boolean { return this.ctxDoc.imageSmoothingEnabled; }
  set imageSmoothingEnabled(val: boolean) { this.ctxDoc.imageSmoothingEnabled = val; }
  get imageSmoothingQuality(): ImageSmoothingQuality { return this.ctxDoc.imageSmoothingQuality; }
  set imageSmoothingQuality(val: ImageSmoothingQuality) { this.ctxDoc.imageSmoothingQuality = val; }
  get fillStyle(): string | CanvasGradient | CanvasPattern { return this.ctxDoc.fillStyle; }
  set fillStyle(val: string | CanvasGradient | CanvasPattern) { this.ctxDoc.fillStyle = val; }
  get strokeStyle(): string | CanvasGradient | CanvasPattern { return this.ctxDoc.strokeStyle; }
  set strokeStyle(val: string | CanvasGradient | CanvasPattern) { this.ctxDoc.strokeStyle = val; }
  get shadowBlur(): number { return this.ctxDoc.shadowBlur; }
  set shadowBlur(val: number) { this.ctxDoc.shadowBlur = val; }
  get shadowColor(): string { return this.ctxDoc.shadowColor; }
  set shadowColor(val: string) { this.ctxDoc.shadowColor = val; }
  get shadowOffsetX(): number { return this.ctxDoc.shadowOffsetX; }
  set shadowOffsetX(val: number) { this.ctxDoc.shadowOffsetX = val; }
  get shadowOffsetY(): number { return this.ctxDoc.shadowOffsetY; }
  set shadowOffsetY(val: number) { this.ctxDoc.shadowOffsetY = val; }
  get filter(): string { return this.ctxDoc.filter; }
  set filter(val: string) { this.ctxDoc.filter = val; }
  get lineCap(): CanvasLineCap { return this.ctxDoc.lineCap; }
  set lineCap(val: CanvasLineCap) { this.ctxDoc.lineCap = val; }
  get lineDashOffset(): number { return this.ctxDoc.lineDashOffset; }
  set lineDashOffset(val: number) { this.ctxDoc.lineDashOffset = val; }
  get lineJoin(): CanvasLineJoin { return this.ctxDoc.lineJoin; }
  set lineJoin(val: CanvasLineJoin) { this.ctxDoc.lineJoin = val; }
  get lineWidth(): number { return this.ctxDoc.lineWidth; }
  set lineWidth(val: number) { this.ctxDoc.lineWidth = val; }
  get miterLimit(): number { return this.ctxDoc.miterLimit; }
  set miterLimit(val: number) { this.ctxDoc.miterLimit = val; }
  get direction(): CanvasDirection { return this.ctxDoc.direction; }
  set direction(val: CanvasDirection) { this.ctxDoc.direction = val; }
  get font(): string { return this.ctxDoc.font; }
  set font(val: string) { this.ctxDoc.font = val; }
  get textAlign(): CanvasTextAlign { return this.ctxDoc.textAlign; }
  set textAlign(val: CanvasTextAlign) { this.ctxDoc.textAlign = val; }
  get textBaseline(): CanvasTextBaseline { return this.ctxDoc.textBaseline; }
  set textBaseline(val: CanvasTextBaseline) { this.ctxDoc.textBaseline = val; }
  //#endregion

  private ctxDoc: CanvasRenderingContext2D;
  private ctxCover: CanvasRenderingContext2D;

  constructor(ctxDoc: CanvasRenderingContext2D, ctxCover:CanvasRenderingContext2D) {
    this.ctxDoc = ctxDoc;
    this.ctxCover = ctxCover;
  }
  public drawCursor(x: number, y: number, height: number, color: string): void {
    this.ctxDoc.beginPath();
    this.ctxDoc.moveTo(x, y);
    this.ctxDoc.strokeStyle = color;
    this.ctxDoc.lineTo(x, y + height);
    this.ctxDoc.stroke();
  }
  public restore(): void {
    return this.ctxDoc.restore.apply(this.ctxDoc, arguments);
  }
  public save(): void {
    return this.ctxDoc.save.apply(this.ctxDoc, arguments);
  }
  public getTransform(): DOMMatrix {
    return this.ctxDoc.getTransform.apply(this.ctxDoc, arguments);
  }
  public resetTransform(): void {
    return this.ctxDoc.resetTransform.apply(this.ctxDoc, arguments);
  }
  public rotate(angle: number): void {
    return this.ctxDoc.rotate.apply(this.ctxDoc, arguments);
  }
  public scale(x: number, y: number): void {
    this.ctxCover.scale(x, y);
    return this.ctxDoc.scale.apply(this.ctxDoc, arguments);
  }
  public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  public setTransform(transform?: DOMMatrix2DInit): void;
  public setTransform(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
    return this.ctxDoc.setTransform.apply(this.ctxDoc, arguments);
  }
  public transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    return this.ctxDoc.transform.apply(this.ctxDoc, arguments);
  }
  public translate(x: number, y: number): void {
    return this.ctxDoc.translate.apply(this.ctxDoc, arguments);
  }
  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.ctxDoc.createLinearGradient.apply(this.ctxDoc, arguments);
  }
  public createPattern(image: CanvasImageSource, repetition: string): CanvasPattern {
    return this.ctxDoc.createPattern.apply(this.ctxDoc, arguments);
  }
  public createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    return this.ctxDoc.createRadialGradient.apply(this.ctxDoc, arguments);
  }
  public clearRect(x: number, y: number, w: number, h: number): void {
    this.ctxCover.clearRect.apply(this.ctxCover, arguments);
    return this.ctxDoc.clearRect.apply(this.ctxDoc, arguments);
  }
  public fillRect(x: number, y: number, w: number, h: number): void {
    return this.ctxDoc.fillRect.apply(this.ctxDoc, arguments);
  }
  public strokeRect(x: number, y: number, w: number, h: number): void {
    return this.ctxDoc.strokeRect.apply(this.ctxDoc, arguments);
  }
  public beginPath(): void {
    return this.ctxDoc.beginPath.apply(this.ctxDoc, arguments);
  }
  public clip(fillRule?: CanvasFillRule): void;
  public clip(path: Path2D, fillRule?: CanvasFillRule): void;
  public clip(path?: any, fillRule?: any) {
    return this.ctxDoc.clip.apply(this.ctxDoc, arguments);
  }
  public fill(fillRule?: CanvasFillRule): void;
  public fill(path: Path2D, fillRule?: CanvasFillRule): void;
  public fill(path?: any, fillRule?: any) {
    return this.ctxDoc.fill.apply(this.ctxDoc, arguments);
  }
  public isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: any, x: any, y?: any, fillRule?: any) {
    return this.ctxDoc.isPointInPath.apply(this.ctxDoc, arguments);
  }
  public isPointInStroke(x: number, y: number): boolean;
  public isPointInStroke(path: Path2D, x: number, y: number): boolean;
  public isPointInStroke(path: any, x: any, y?: any) {
    return this.ctxDoc.isPointInStroke.apply(this.ctxDoc, arguments);
  }
  public stroke(): void;
  public stroke(path: Path2D): void;
  public stroke(path?: any) {
    return this.ctxDoc.stroke.apply(this.ctxDoc, arguments);
  }
  public drawFocusIfNeeded(element: Element): void;
  public drawFocusIfNeeded(path: Path2D, element: Element): void;
  public drawFocusIfNeeded(path: any, element?: any) {
    return this.ctxDoc.drawFocusIfNeeded.apply(this.ctxDoc, arguments);
  }
  public scrollPathIntoView(): void;
  public scrollPathIntoView(path: Path2D): void;
  public scrollPathIntoView(path?: any) {
    return this.ctxDoc.scrollPathIntoView.apply(this.ctxDoc, arguments);
  }
  public fillText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctxDoc.fillText.apply(this.ctxDoc, arguments);
  }
  public measureText(text: string): TextMetrics {
    return this.ctxDoc.measureText.apply(this.ctxDoc, arguments);
  }
  public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctxDoc.strokeText.apply(this.ctxDoc, arguments);
  }
  public drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  public drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: any, sx: any, sy: any, sw?: any, sh?: any, dx?: any, dy?: any, dw?: any, dh?: any) {
    return this.ctxDoc.drawImage.apply(this.ctxDoc, arguments);
  }
  public createImageData(sw: number, sh: number): ImageData;
  public createImageData(imagedata: ImageData): ImageData;
  public createImageData(sw: any, sh?: any) {
    return this.ctxDoc.createImageData.apply(this.ctxDoc, arguments);
  }
  public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.ctxDoc.getImageData.apply(this.ctxDoc, arguments);
  }
  public putImageData(imagedata: ImageData, dx: number, dy: number): void;
  public putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
  public putImageData(imagedata: any, dx: any, dy: any, dirtyX?: any, dirtyY?: any, dirtyWidth?: any, dirtyHeight?: any) {
    return this.ctxDoc.putImageData.apply(this.ctxDoc, arguments);
  }
  public getLineDash(): number[] {
    return this.ctxDoc.getLineDash.apply(this.ctxDoc, arguments);
  }
  public setLineDash(segments: number[]): void {
    return this.ctxDoc.setLineDash.apply(this.ctxDoc, arguments);
  }
  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctxDoc.arc.apply(this.ctxDoc, arguments);
  }
  public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    return this.ctxDoc.arcTo.apply(this.ctxDoc, arguments);
  }
  public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    return this.ctxDoc.bezierCurveTo.apply(this.ctxDoc, arguments);
  }
  public closePath(): void {
    return this.ctxDoc.closePath.apply(this.ctxDoc, arguments);
  }
  public ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctxDoc.ellipse.apply(this.ctxDoc, arguments);
  }
  public lineTo(x: number, y: number): void {
    return this.ctxDoc.lineTo.apply(this.ctxDoc, arguments);
  }
  public moveTo(x: number, y: number): void {
    return this.ctxDoc.moveTo.apply(this.ctxDoc, arguments);
  }
  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    return this.ctxDoc.quadraticCurveTo.apply(this.ctxDoc, arguments);
  }
  public rect(x: number, y: number, w: number, h: number): void {
    return this.ctxDoc.rect.apply(this.ctxDoc, arguments);
  }

  public drawSelectionArea(rects: IRectangle[], scrollTop: number): void {
    this.ctxCover.fillStyle = "rgba(71, 155, 253, 0.2)";
    for (let index = 0; index < rects.length; index++) {
      const rect = rects[index];
      this.ctxCover.fillRect(rect.x, rect.y - scrollTop, rect.width, rect.height);
    }
  }
}
