/* eslint prefer-rest-params: "off" */
import IRectangle from '../src/scripts/Common/IRectangle'
import { ISearchResult } from '../src/scripts/Common/ISearchResult'
import ICanvasContext from '../src/scripts/Common/ICanvasContext'

export default class MockCanvasContext implements ICanvasContext {
  // #region 覆盖 CanvasRenderingContext2D 上的属性
  get canvas(): HTMLCanvasElement {
    return this.ctxDoc.canvas
  }
  // set canvas(val: HTMLCanvasElement) {this.ctx.canvas = val;}  // 这是一个 readonly 属性不能设置 setter
  get globalAlpha(): number {
    return this.ctxDoc.globalAlpha
  }
  set globalAlpha(val: number) {
    this.ctxDoc.globalAlpha = val
    this.log.push({ func: 'set globalAlpha', args: [val] })
  }
  get globalCompositeOperation(): string {
    return this.ctxDoc.globalCompositeOperation
  }
  set globalCompositeOperation(val: string) {
    this.ctxDoc.globalCompositeOperation = val
    this.log.push({ func: 'set globalCompositeOperation', args: [val] })
  }
  get imageSmoothingEnabled(): boolean {
    return this.ctxDoc.imageSmoothingEnabled
  }
  set imageSmoothingEnabled(val: boolean) {
    this.ctxDoc.imageSmoothingEnabled = val
    this.log.push({ func: 'set imageSmoothingEnabled', args: [val] })
  }
  get imageSmoothingQuality(): ImageSmoothingQuality {
    return this.ctxDoc.imageSmoothingQuality
  }
  set imageSmoothingQuality(val: ImageSmoothingQuality) {
    this.ctxDoc.imageSmoothingQuality = val
    this.log.push({ func: 'set imageSmoothingQuality', args: [val] })
  }
  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctxDoc.fillStyle
  }
  set fillStyle(val: string | CanvasGradient | CanvasPattern) {
    this.ctxDoc.fillStyle = val
    this.log.push({ func: 'set fillStyle', args: [val] })
  }
  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctxDoc.strokeStyle
  }
  set strokeStyle(val: string | CanvasGradient | CanvasPattern) {
    this.ctxDoc.strokeStyle = val
    this.log.push({ func: 'set strokeStyle', args: [val] })
  }
  get shadowBlur(): number {
    return this.ctxDoc.shadowBlur
  }
  set shadowBlur(val: number) {
    this.ctxDoc.shadowBlur = val
    this.log.push({ func: 'set shadowBlur', args: [val] })
  }
  get shadowColor(): string {
    return this.ctxDoc.shadowColor
  }
  set shadowColor(val: string) {
    this.ctxDoc.shadowColor = val
    this.log.push({ func: 'set shadowColor', args: [val] })
  }
  get shadowOffsetX(): number {
    return this.ctxDoc.shadowOffsetX
  }
  set shadowOffsetX(val: number) {
    this.ctxDoc.shadowOffsetX = val
    this.log.push({ func: 'set shadowOffsetX', args: [val] })
  }
  get shadowOffsetY(): number {
    return this.ctxDoc.shadowOffsetY
  }
  set shadowOffsetY(val: number) {
    this.ctxDoc.shadowOffsetY = val
    this.log.push({ func: 'set shadowOffsetY', args: [val] })
  }
  get filter(): string {
    return this.ctxDoc.filter
  }
  set filter(val: string) {
    this.ctxDoc.filter = val
    this.log.push({ func: 'set filter', args: [val] })
  }
  get lineCap(): CanvasLineCap {
    return this.ctxDoc.lineCap
  }
  set lineCap(val: CanvasLineCap) {
    this.ctxDoc.lineCap = val
    this.log.push({ func: 'set lineCap', args: [val] })
  }
  get lineDashOffset(): number {
    return this.ctxDoc.lineDashOffset
  }
  set lineDashOffset(val: number) {
    this.ctxDoc.lineDashOffset = val
    this.log.push({ func: 'set lineDashOffset', args: [val] })
  }
  get lineJoin(): CanvasLineJoin {
    return this.ctxDoc.lineJoin
  }
  set lineJoin(val: CanvasLineJoin) {
    this.ctxDoc.lineJoin = val
    this.log.push({ func: 'set lineJoin', args: [val] })
  }
  get lineWidth(): number {
    return this.ctxDoc.lineWidth
  }
  set lineWidth(val: number) {
    this.ctxDoc.lineWidth = val
    this.log.push({ func: 'set lineWidth', args: [val] })
  }
  get miterLimit(): number {
    return this.ctxDoc.miterLimit
  }
  set miterLimit(val: number) {
    this.ctxDoc.miterLimit = val
    this.log.push({ func: 'set miterLimit', args: [val] })
  }
  get direction(): CanvasDirection {
    return this.ctxDoc.direction
  }
  set direction(val: CanvasDirection) {
    this.ctxDoc.direction = val
    this.log.push({ func: 'set direction', args: [val] })
  }
  get font(): string {
    return this.ctxDoc.font
  }
  set font(val: string) {
    this.ctxDoc.font = val
    this.log.push({ func: 'set font', args: [val] })
  }
  get textAlign(): CanvasTextAlign {
    return this.ctxDoc.textAlign
  }
  set textAlign(val: CanvasTextAlign) {
    this.ctxDoc.textAlign = val
    this.log.push({ func: 'set textAlign', args: [val] })
  }
  get textBaseline(): CanvasTextBaseline {
    return this.ctxDoc.textBaseline
  }
  set textBaseline(val: CanvasTextBaseline) {
    this.ctxDoc.textBaseline = val
    this.log.push({ func: 'set textBaseline', args: [val] })
  }
  // #endregion

  private ctxDoc: CanvasRenderingContext2D

  private SELECTION_AREA_COLOR = 'rgba(71, 155, 253, 0.2)'
  private SEARCH_RESULT_COLOR = 'rgba(255, 193, 0, 0.4)'
  private SEARCH_RESULT_CURRENT_ITEM_COLOR = 'rgba(0, 83, 180, 0.25)'

  public log: { func: string; args: any[] }[] = []
  constructor(ctxDoc: CanvasRenderingContext2D) {
    this.ctxDoc = ctxDoc
  }
  public clearLog() {
    this.log.length = 0
    this.log.push({
      func: 'clearLog',
      args: [],
    })
  }
  public drawCursor(x: number, y: number, height: number, color: string): void {
    this.log.push({
      func: 'drawCursor',
      args: Array.from(arguments),
    })
    this.ctxDoc.beginPath()
    this.ctxDoc.moveTo(x, y)
    this.ctxDoc.strokeStyle = color
    this.ctxDoc.lineTo(x, y + height)
    this.ctxDoc.stroke()
  }
  public restore(): void {
    this.log.push({
      func: 'restore',
      args: Array.from(arguments),
    })
    return this.ctxDoc.restore()
  }
  public save(): void {
    this.log.push({
      func: 'save',
      args: Array.from(arguments),
    })
    return this.ctxDoc.save()
  }
  public getTransform(): DOMMatrix {
    this.log.push({
      func: 'getTransform',
      args: Array.from(arguments),
    })
    return this.ctxDoc.getTransform()
  }
  public resetTransform(): void {
    this.log.push({
      func: 'resetTransform',
      args: Array.from(arguments),
    })
    return this.ctxDoc.resetTransform()
  }
  public rotate(angle: number): void {
    this.log.push({
      func: 'rotate',
      args: Array.from(arguments),
    })
    return this.ctxDoc.rotate(angle)
  }
  public scale(x: number, y: number): void {
    this.log.push({
      func: 'scale',
      args: Array.from(arguments),
    })
    return this.ctxDoc.scale(x, y)
  }
  public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  public setTransform(transform?: DOMMatrix2DInit): void
  public setTransform(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
    this.log.push({
      func: 'setTransform',
      args: Array.from(arguments),
    })
    if (a === undefined) {
      return this.ctxDoc.setTransform()
    } else if (b === undefined) {
      return this.ctxDoc.setTransform(a)
    } else if (c !== undefined && d !== undefined && e !== undefined && f !== undefined) {
      return this.ctxDoc.setTransform(a, b, c, d, e, f)
    }
  }
  public transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push({
      func: 'transform',
      args: Array.from(arguments),
    })
    return this.ctxDoc.transform(a, b, c, d, e, f)
  }
  public translate(x: number, y: number): void {
    this.log.push({
      func: 'translate',
      args: Array.from(arguments),
    })
    return this.ctxDoc.translate(x, y)
  }
  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    this.log.push({
      func: 'createLinearGradient',
      args: Array.from(arguments),
    })
    return this.ctxDoc.createLinearGradient(x0, y0, x1, y1)
  }
  public createPattern(image: CanvasImageSource, repetition: string): CanvasPattern | null {
    this.log.push({
      func: 'createPattern',
      args: Array.from(arguments),
    })
    return this.ctxDoc.createPattern(image, repetition)
  }
  public createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    this.log.push({
      func: 'createRadialGradient',
      args: Array.from(arguments),
    })
    return this.ctxDoc.createRadialGradient(x0, y0, r0, x1, y1, r1)
  }
  public clearRect(x: number, y: number, w: number, h: number): void {
    this.log.push({
      func: 'clearRect',
      args: Array.from(arguments),
    })
    return this.ctxDoc.clearRect(x, y, w, h)
  }
  public fillRect(x: number, y: number, w: number, h: number): void {
    this.log.push({
      func: 'fillRect',
      args: Array.from(arguments),
    })
    return this.ctxDoc.fillRect(x, y, w, h)
  }
  public strokeRect(x: number, y: number, w: number, h: number): void {
    this.log.push({
      func: 'strokeRect',
      args: Array.from(arguments),
    })
    return this.ctxDoc.strokeRect(x, y, w, h)
  }
  public beginPath(): void {
    this.log.push({
      func: 'beginPath',
      args: Array.from(arguments),
    })
    return this.ctxDoc.beginPath()
  }
  public clip(fillRule?: CanvasFillRule): void
  public clip(path: Path2D, fillRule?: CanvasFillRule): void
  public clip(path?: any, fillRule?: any) {
    this.log.push({
      func: 'clip',
      args: Array.from(arguments),
    })
    return this.ctxDoc.clip(path, fillRule)
  }
  public fill(fillRule?: CanvasFillRule): void
  public fill(path: Path2D, fillRule?: CanvasFillRule): void
  public fill(path?: any, fillRule?: any) {
    this.log.push({
      func: 'fill',
      args: Array.from(arguments),
    })
    return this.ctxDoc.fill(path, fillRule)
  }
  public isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean
  public isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean
  public isPointInPath(path: any, x: any, y?: any, fillRule?: any) {
    this.log.push({
      func: 'isPointInPath',
      args: Array.from(arguments),
    })
    return this.ctxDoc.isPointInPath(path, x, y, fillRule)
  }
  public isPointInStroke(x: number, y: number): boolean
  public isPointInStroke(path: Path2D, x: number, y: number): boolean
  public isPointInStroke(path: any, x: any, y?: any) {
    this.log.push({
      func: 'isPointInStroke',
      args: Array.from(arguments),
    })
    return this.ctxDoc.isPointInStroke(path, x, y)
  }
  public stroke(): void
  public stroke(path?: Path2D): void {
    this.log.push({
      func: 'stroke',
      args: Array.from(arguments),
    })
    if (path !== undefined) {
      return this.ctxDoc.stroke(path)
    }
    return this.ctxDoc.stroke()
  }
  public drawFocusIfNeeded(element: Element): void
  public drawFocusIfNeeded(path: Path2D, element: Element): void
  public drawFocusIfNeeded(path: any, element?: any) {
    this.log.push({
      func: 'drawFocusIfNeeded',
      args: Array.from(arguments),
    })
    return this.ctxDoc.drawFocusIfNeeded(path, element)
  }
  public scrollPathIntoView(): void
  public scrollPathIntoView(path?: Path2D): void {
    this.log.push({
      func: 'scrollPathIntoView',
      args: Array.from(arguments),
    })
    if (path !== undefined) {
      return this.ctxDoc.scrollPathIntoView(path)
    }
    return this.ctxDoc.scrollPathIntoView()
  }
  public fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this.log.push({
      func: 'fillText',
      args: Array.from(arguments),
    })
    return this.ctxDoc.fillText(text, x, y, maxWidth)
  }
  public measureText(text: string): TextMetrics {
    this.log.push({
      func: 'measureText',
      args: Array.from(arguments),
    })
    return this.ctxDoc.measureText(text)
  }
  public strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    this.log.push({
      func: 'strokeText',
      args: Array.from(arguments),
    })
    return this.ctxDoc.strokeText(text, x, y, maxWidth)
  }
  public drawImage(image: CanvasImageSource, dx: number, dy: number): void
  public drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void
  public drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void
  public drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw?: number,
    sh?: number,
    dx?: number,
    dy?: number,
    dw?: number,
    dh?: number,
  ) {
    this.log.push({
      func: 'drawImage',
      args: Array.from(arguments),
    })
    if (dh !== undefined) {
      return this.ctxDoc.drawImage(image, sx, sy, sw!, sh!, dx!, dy!, dw!, dh)
    } else if (sh !== undefined) {
      return this.ctxDoc.drawImage(image, sx, sy, sw!, sh)
    } else {
      return this.ctxDoc.drawImage(image, sx, sy)
    }
  }
  public createImageData(sw: number, sh: number): ImageData
  public createImageData(imagedata: ImageData): ImageData
  public createImageData(sw: any, sh?: any) {
    this.log.push({
      func: 'createImageData',
      args: Array.from(arguments),
    })
    return this.ctxDoc.createImageData(sw, sh)
  }
  public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    this.log.push({
      func: 'getImageData',
      args: Array.from(arguments),
    })
    return this.ctxDoc.getImageData(sx, sy, sw, sh)
  }
  public putImageData(imagedata: ImageData, dx: number, dy: number): void
  public putImageData(
    imagedata: ImageData,
    dx: number,
    dy: number,
    dirtyX: number,
    dirtyY: number,
    dirtyWidth: number,
    dirtyHeight: number,
  ): void
  public putImageData(
    imagedata: any,
    dx: any,
    dy: any,
    dirtyX?: any,
    dirtyY?: any,
    dirtyWidth?: any,
    dirtyHeight?: any,
  ) {
    this.log.push({
      func: 'putImageData',
      args: Array.from(arguments),
    })
    if (dirtyX) {
      return this.ctxDoc.putImageData(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)
    } else {
      return this.ctxDoc.putImageData(imagedata, dx, dy)
    }
  }
  public getLineDash(): number[] {
    this.log.push({
      func: 'getLineDash',
      args: Array.from(arguments),
    })
    return this.ctxDoc.getLineDash()
  }
  public setLineDash(segments: number[]): void {
    this.log.push({
      func: 'setLineDash',
      args: Array.from(arguments),
    })
    return this.ctxDoc.setLineDash(segments)
  }
  public arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean,
  ): void {
    this.log.push({
      func: 'arc',
      args: Array.from(arguments),
    })
    return this.ctxDoc.arc(x, y, radius, startAngle, endAngle, anticlockwise)
  }
  public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.log.push({
      func: 'arcTo',
      args: Array.from(arguments),
    })
    return this.ctxDoc.arcTo(x1, y1, x2, y2, radius)
  }
  public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.log.push({
      func: 'bezierCurveTo',
      args: Array.from(arguments),
    })
    return this.ctxDoc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
  }
  public closePath(): void {
    this.log.push({
      func: 'closePath',
      args: Array.from(arguments),
    })
    return this.ctxDoc.closePath()
  }
  public ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean,
  ): void {
    this.log.push({
      func: 'ellipse',
      args: Array.from(arguments),
    })
    return this.ctxDoc.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise)
  }
  public lineTo(x: number, y: number): void {
    this.log.push({
      func: 'lineTo',
      args: Array.from(arguments),
    })
    return this.ctxDoc.lineTo(x, y)
  }
  public moveTo(x: number, y: number): void {
    this.log.push({
      func: 'moveTo',
      args: Array.from(arguments),
    })
    return this.ctxDoc.moveTo(x, y)
  }
  public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.log.push({
      func: 'quadraticCurveTo',
      args: Array.from(arguments),
    })
    return this.ctxDoc.quadraticCurveTo(cpx, cpy, x, y)
  }
  public rect(x: number, y: number, w: number, h: number): void {
    this.log.push({
      func: 'rect',
      args: Array.from(arguments),
    })
    return this.ctxDoc.rect(x, y, w, h)
  }

  public drawSelectionArea(rects: IRectangle[], scrollTop: number, viewEnd: number, startIndex: number): void {
    this.log.push({
      func: 'drawSelectionArea',
      args: Array.from(arguments),
    })
    this.ctxDoc.fillStyle = this.SELECTION_AREA_COLOR
    for (let index = startIndex; index < rects.length; index++) {
      const rect = rects[index]
      if (rects[0].y > viewEnd) {
        break
      }
      this.ctxDoc.fillRect(rect.x, rect.y - scrollTop, rect.width, rect.height)
    }
  }

  public drawSearchResult(
    results: ISearchResult[],
    scrollTop: number,
    viewEnd: number,
    startIndex: number,
    currentIndex?: number,
  ): void {
    this.log.push({
      func: 'drawSearchResult',
      args: Array.from(arguments),
    })
    for (let index = startIndex; index < results.length; index++) {
      const rects = results[index].rects

      if (rects[0].y > viewEnd) {
        break
      }

      if (index === currentIndex) {
        this.ctxDoc.fillStyle = this.SEARCH_RESULT_CURRENT_ITEM_COLOR
      } else {
        this.ctxDoc.fillStyle = this.SEARCH_RESULT_COLOR
      }
      for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
        const rect = rects[rectIndex]
        this.ctxDoc.fillRect(rect.x, rect.y - scrollTop, rect.width, rect.height)
      }
    }
  }
}
