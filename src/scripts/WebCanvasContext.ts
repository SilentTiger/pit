import ICanvasContext from './Common/ICanvasContext'
import IRectangle from './Common/IRectangle'
import { ISearchResult } from './Common/ISearchResult'

export default class WebCanvasContext implements ICanvasContext {
  // #region 覆盖 CanvasRenderingContext2D 上的属性
  get canvas(): HTMLCanvasElement { return this.ctxDoc.canvas }
  // set canvas(val: HTMLCanvasElement) {this.ctx.canvas = val;}  // 这是一个 readonly 属性不能设置 setter
  get globalAlpha(): number { return this.ctxDoc.globalAlpha }
  set globalAlpha(val: number) { this.ctxDoc.globalAlpha = val }
  get globalCompositeOperation(): string { return this.ctxDoc.globalCompositeOperation }
  set globalCompositeOperation(val: string) { this.ctxDoc.globalCompositeOperation = val }
  get imageSmoothingEnabled(): boolean { return this.ctxDoc.imageSmoothingEnabled }
  set imageSmoothingEnabled(val: boolean) { this.ctxDoc.imageSmoothingEnabled = val }
  get imageSmoothingQuality(): ImageSmoothingQuality { return this.ctxDoc.imageSmoothingQuality }
  set imageSmoothingQuality(val: ImageSmoothingQuality) { this.ctxDoc.imageSmoothingQuality = val }
  get fillStyle(): string | CanvasGradient | CanvasPattern { return this.ctxDoc.fillStyle }
  set fillStyle(val: string | CanvasGradient | CanvasPattern) { this.ctxDoc.fillStyle = val }
  get strokeStyle(): string | CanvasGradient | CanvasPattern { return this.ctxDoc.strokeStyle }
  set strokeStyle(val: string | CanvasGradient | CanvasPattern) { this.ctxDoc.strokeStyle = val }
  get shadowBlur(): number { return this.ctxDoc.shadowBlur }
  set shadowBlur(val: number) { this.ctxDoc.shadowBlur = val }
  get shadowColor(): string { return this.ctxDoc.shadowColor }
  set shadowColor(val: string) { this.ctxDoc.shadowColor = val }
  get shadowOffsetX(): number { return this.ctxDoc.shadowOffsetX }
  set shadowOffsetX(val: number) { this.ctxDoc.shadowOffsetX = val }
  get shadowOffsetY(): number { return this.ctxDoc.shadowOffsetY }
  set shadowOffsetY(val: number) { this.ctxDoc.shadowOffsetY = val }
  get filter(): string { return this.ctxDoc.filter }
  set filter(val: string) { this.ctxDoc.filter = val }
  get lineCap(): CanvasLineCap { return this.ctxDoc.lineCap }
  set lineCap(val: CanvasLineCap) { this.ctxDoc.lineCap = val }
  get lineDashOffset(): number { return this.ctxDoc.lineDashOffset }
  set lineDashOffset(val: number) { this.ctxDoc.lineDashOffset = val }
  get lineJoin(): CanvasLineJoin { return this.ctxDoc.lineJoin }
  set lineJoin(val: CanvasLineJoin) { this.ctxDoc.lineJoin = val }
  get lineWidth(): number { return this.ctxDoc.lineWidth }
  set lineWidth(val: number) { this.ctxDoc.lineWidth = val }
  get miterLimit(): number { return this.ctxDoc.miterLimit }
  set miterLimit(val: number) { this.ctxDoc.miterLimit = val }
  get direction(): CanvasDirection { return this.ctxDoc.direction }
  set direction(val: CanvasDirection) { this.ctxDoc.direction = val }
  get font(): string { return this.ctxDoc.font }
  set font(val: string) { this.ctxDoc.font = val }
  get textAlign(): CanvasTextAlign { return this.ctxDoc.textAlign }
  set textAlign(val: CanvasTextAlign) { this.ctxDoc.textAlign = val }
  get textBaseline(): CanvasTextBaseline { return this.ctxDoc.textBaseline }
  set textBaseline(val: CanvasTextBaseline) { this.ctxDoc.textBaseline = val }
  // #endregion

  private ctxDoc: CanvasRenderingContext2D;
  private ctxCover: CanvasRenderingContext2D;

  private SELECTION_AREA_COLOR = 'rgba(71, 155, 253, 0.2)';
  private SEARCH_RESULT_COLOR = 'rgba(255, 193, 0, 0.4)';
  private SEARCH_RESULT_CURRENT_ITEM_COLOR = 'rgba(0, 83, 180, 0.25)';

  constructor(ctxDoc: CanvasRenderingContext2D, ctxCover: CanvasRenderingContext2D) {
    this.ctxDoc = ctxDoc
    this.ctxCover = ctxCover
  }
  public drawCursor(x: number, y: number, height: number, color: string): void {
    this.ctxDoc.beginPath()
    this.ctxDoc.moveTo(x, y)
    this.ctxDoc.strokeStyle = color
    this.ctxDoc.lineTo(x, y + height)
    this.ctxDoc.stroke()
  }
  public restore(): void {
    return this.ctxDoc.restore()
  }
  public save(): void {
    return this.ctxDoc.save()
  }
  public getTransform(): DOMMatrix {
    return this.ctxDoc.getTransform()
  }
  public resetTransform(): void {
    return this.ctxDoc.resetTransform()
  }
  public rotate(angle: number): void {
    return this.ctxDoc.rotate(angle)
  }
  public scale(x: number, y: number): void {
    this.ctxCover.scale(x, y)
    return this.ctxDoc.scale(x, y)
  }
  public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  public setTransform(transform?: DOMMatrix2DInit): void;
  public setTransform(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
    if (a === undefined) {
      return this.ctxDoc.setTransform()
    } else if (b === undefined) {
      return this.ctxDoc.setTransform(a)
    } else if (c !== undefined && d !== undefined && e !== undefined && f !== undefined) {
      return this.ctxDoc.setTransform(a, b, c, d, e, f)
    }
  }
  public transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    return this.ctxDoc.transform(a, b, c, d, e, f)
  }
  public translate(x: number, y: number): void {
    return this.ctxDoc.translate(x, y)
  }
  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.ctxDoc.createLinearGradient(x0, y0, x1, y1)
  }
  public createPattern(image: CanvasImageSource, repetition: string): CanvasPattern | null {
    return this.ctxDoc.createPattern(image, repetition)
  }
  public createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    return this.ctxDoc.createRadialGradient(x0, y0, r0, x1, y1, r1)
  }
  public clearRect(x: number, y: number, w: number, h: number): void {
    this.ctxCover.clearRect(x, y, w, h)
    return this.ctxDoc.clearRect(x, y, w, h)
  }
  public fillRect(x: number, y: number, w: number, h: number): void {
    return this.ctxDoc.fillRect(x, y, w, h)
  }
  public strokeRect(x: number, y: number, w: number, h: number): void {
    return this.ctxDoc.strokeRect(x, y, w, h)
  }
  public beginPath(): void {
    return this.ctxDoc.beginPath()
  }
  public clip(fillRule?: CanvasFillRule): void;
  public clip(path: Path2D, fillRule?: CanvasFillRule): void;
  public clip(path?: any, fillRule?: any) {
    return this.ctxDoc.clip(path, fillRule)
  }
  public fill(fillRule?: CanvasFillRule): void;
  public fill(path: Path2D, fillRule?: CanvasFillRule): void;
  public fill(path?: any, fillRule?: any) {
    return this.ctxDoc.fill(path, fillRule)
  }
  public isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
  public isPointInPath(path: any, x: any, y?: any, fillRule?: any) {
    return this.ctxDoc.isPointInPath(path, x, y, fillRule)
  }
  public isPointInStroke(x: number, y: number): boolean;
  public isPointInStroke(path: Path2D, x: number, y: number): boolean;
  public isPointInStroke(path: any, x: any, y?: any) {
    return this.ctxDoc.isPointInStroke(path, x, y)
  }
  public stroke(): void;
  public stroke(path?: Path2D): void {
    if (path !== undefined) {
      return this.ctxDoc.stroke(path)
    }
    return this.ctxDoc.stroke()
  }
  public drawFocusIfNeeded(element: Element): void;
  public drawFocusIfNeeded(path: Path2D, element: Element): void;
  public drawFocusIfNeeded(path: any, element?: any) {
    return this.ctxDoc.drawFocusIfNeeded(path, element)
  }
  public scrollPathIntoView(): void;
  public scrollPathIntoView(path?: Path2D): void {
    if (path !== undefined) {
      return this.ctxDoc.scrollPathIntoView(path)
    }
    return this.ctxDoc.scrollPathIntoView()
  }
  public fillText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctxDoc.fillText(text, x, y, maxWidth)
  }
  public measureText(text: string): TextMetrics {
    return this.ctxDoc.measureText(text)
  }
  public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    return this.ctxDoc.strokeText(text, x, y, maxWidth)
  }
  public drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  public drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  public drawImage(image: CanvasImageSource, sx: number, sy: number, sw?: number, sh?: number, dx?: number, dy?: number, dw?: number, dh?: number) {
    if (dh !== undefined) {
      return this.ctxDoc.drawImage(image, sx, sy, sw!, sh!, dx!, dy!, dw!, dh)
    } else if (sh !== undefined) {
      return this.ctxDoc.drawImage(image, sx, sy, sw!, sh)
    } else {
      return this.ctxDoc.drawImage(image, sx, sy)
    }
  }
  public createImageData(sw: number, sh: number): ImageData;
  public createImageData(imagedata: ImageData): ImageData;
  public createImageData(sw: any, sh?: any) {
    return this.ctxDoc.createImageData(sw, sh)
  }
  public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.ctxDoc.getImageData(sx, sy, sw, sh)
  }
  public putImageData(imagedata: ImageData, dx: number, dy: number): void;
  public putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
  public putImageData(imagedata: any, dx: any, dy: any, dirtyX?: any, dirtyY?: any, dirtyWidth?: any, dirtyHeight?: any) {
    if (dirtyX) {
      return this.ctxDoc.putImageData(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)
    } else {
      return this.ctxDoc.putImageData(imagedata, dx, dy)
    }
  }
  public getLineDash(): number[] {
    return this.ctxDoc.getLineDash()
  }
  public setLineDash(segments: number[]): void {
    return this.ctxDoc.setLineDash(segments)
  }
  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctxDoc.arc(x, y, radius, startAngle, endAngle, anticlockwise)
  }
  public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    return this.ctxDoc.arcTo(x1, y1, x2, y2, radius)
  }
  public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    return this.ctxDoc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
  }
  public closePath(): void {
    return this.ctxDoc.closePath()
  }
  public ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    return this.ctxDoc.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise)
  }
  public lineTo(x: number, y: number): void {
    return this.ctxDoc.lineTo(x, y)
  }
  public moveTo(x: number, y: number): void {
    return this.ctxDoc.moveTo(x, y)
  }
  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    return this.ctxDoc.quadraticCurveTo(cpx, cpy, x, y)
  }
  public rect(x: number, y: number, w: number, h: number): void {
    return this.ctxDoc.rect(x, y, w, h)
  }

  public drawSelectionArea(rects: IRectangle[], scrollTop: number): void {
    this.ctxCover.fillStyle = this.SELECTION_AREA_COLOR
    for (let index = 0; index < rects.length; index++) {
      const rect = rects[index]
      this.ctxCover.fillRect(rect.x, rect.y - scrollTop, rect.width, rect.height)
    }
  }

  public drawSearchResult(results: ISearchResult[], scrollTop: number, viewEnd: number, startIndex: number, currentIndex?: number): void {
    for (let index = startIndex; index < results.length; index++) {
      const rects = results[index].rects

      if (rects[0].y > viewEnd) { break }

      if (index === currentIndex) {
        this.ctxCover.fillStyle = this.SEARCH_RESULT_CURRENT_ITEM_COLOR
      } else {
        this.ctxCover.fillStyle = this.SEARCH_RESULT_COLOR
      }
      for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
        const rect = rects[rectIndex]
        this.ctxCover.fillRect(rect.x, rect.y - scrollTop, rect.width, rect.height)
      }
    }
  }
}
