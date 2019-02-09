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
    return this.ctx.restore();
  }
  public save(): void {
    return this.ctx.save();
  }
  public getTransform(): DOMMatrix {
    return this.ctx.getTransform();
  }
  public resetTransform(): void {
    return this.ctx.resetTransform();
  }
  public rotate(angle: number): void {
    return this.ctx.rotate(angle);
  }
  public scale(x: number, y: number): void {
    return this.ctx.scale(x, y);
  }
  public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  public setTransform(transform?: DOMMatrix2DInit): void;
  public setTransform(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
    return this.ctx.setTransform(...arguments);
  }
  public transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    return this.ctx.transform(a, b, c, d, e, f);
  }
  public translate(x: number, y: number): void {
    return this.ctx.translate(x, y);
  }
  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.ctx.createLinearGradient(x0, y0, x1, y1);
  }
  public createPattern(image: CanvasImageSource, repetition: string): CanvasPattern {
    return this.ctx.createPattern(image, repetition);
  }
  public createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    return this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }
  public clearRect(x: number, y: number, w: number, h: number): void {
    return this.ctx.clearRect(x, y, w, h);
  }
  public fillRect(x: number, y: number, w: number, h: number): void {
    return this.ctx.fillRect(x, y, w, h);
  }
  public strokeRect(x: number, y: number, w: number, h: number): void {
    return this.ctx.strokeRect(x, y, w, h);
  }
  public beginPath(): void {
    return this.ctx.beginPath();
  }
  public clip(fillRule?: CanvasFillRule): void;
  public clip(path: Path2D, fillRule?: CanvasFillRule): void;
  public clip(path?: any, fillRule?: any) {
    return this.ctx.clip(...arguments);
  }
  public fill(fillRule?: CanvasFillRule): void;
  public fill(path: Path2D, fillRule?: CanvasFillRule): void;
  public fill(path?: any, fillRule?: any) {
    return this.ctx.fill(...arguments);
  }
  public isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: any, x: any, y?: any, fillRule?: any) {
    const [arg0, arg1, ...args] = arguments;
    return this.ctx.isPointInPath(arg0, arg1, ...args);
  }
  public isPointInStroke(x: number, y: number): boolean;
  public isPointInStroke(path: Path2D, x: number, y: number): boolean;
  public isPointInStroke(path: any, x: any, y?: any) {
    const [arg0, arg1, arg2] = arguments;
    return this.ctx.isPointInStroke(arg0, arg1, arg2);
  }
  public stroke(): void;
  public stroke(path: Path2D): void;
  public stroke(path?: any) {
    return this.ctx.stroke(arguments[0]);
  }
  public drawFocusIfNeeded(element: Element): void;
  public drawFocusIfNeeded(path: Path2D, element: Element): void;
  public drawFocusIfNeeded(path: any, element?: any) {
    const [arg0, arg1] = arguments;
    return this.ctx.drawFocusIfNeeded(arg0, arg1);
  }
  public scrollPathIntoView(): void;
  public scrollPathIntoView(path: Path2D): void;
  public scrollPathIntoView(path?: any) {
    return this.ctx.scrollPathIntoView();
  }
  public fillText(text: string, x: number, y: number, maxWidth?: number): void {
    const [arg0, arg1, arg2, arg3] = arguments;
    return this.ctx.fillText(arg0, arg1, arg2, arg3);
  }
  public measureText(text: string): TextMetrics {
    return this.ctx.measureText(text);
  }
  public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctx.strokeText(text, x, y, maxWidth);
  }
  public drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  public drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: any, sx: any, sy: any, sw?: any, sh?: any, dx?: any, dy?: any, dw?: any, dh?: any) {
    const [arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8] = arguments;
    return this.ctx.drawImage(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
  }
  public createImageData(sw: number, sh: number): ImageData;
  public createImageData(imagedata: ImageData): ImageData;
  public createImageData(sw: any, sh?: any) {
    const [arg0, arg1] = arguments;
    return this.ctx.createImageData(arg0, arg1);
  }
  public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.ctx.getImageData(sx, sy, sw, sh);
  }
  public putImageData(imagedata: ImageData, dx: number, dy: number): void;
  public putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
  public putImageData(imagedata: any, dx: any, dy: any, dirtyX?: any, dirtyY?: any, dirtyWidth?: any, dirtyHeight?: any) {
    const [arg0, arg1, arg2, arg3, arg4, arg5, arg6] = arguments;
    return this.ctx.putImageData(arg0, arg1, arg2, arg3, arg4, arg5, arg6);
  }
  public getLineDash(): number[] {
    return this.ctx.getLineDash();
  }
  public setLineDash(segments: number[]): void {
    return this.ctx.setLineDash(segments);
  }
  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
  }
  public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    return this.ctx.arcTo(x1, y1, x2, y2, radius);
  }
  public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    return this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }
  public closePath(): void {
    return this.ctx.closePath();
  }
  public ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise);
  }
  public lineTo(x: number, y: number): void {
    return this.ctx.lineTo(x, y);
  }
  public moveTo(x: number, y: number): void {
    return this.ctx.moveTo(x, y);
  }
  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    return this.ctx.quadraticCurveTo(cpx, cpy, x, y);
  }
  public rect(x: number, y: number, w: number, h: number): void {
    return this.ctx.rect(x, y, w, h);
  }
}
