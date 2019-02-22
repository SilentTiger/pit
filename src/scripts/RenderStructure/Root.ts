import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { LinkedList } from "../Common/LinkedList";
import Document from '../DocStructure/Document';
import Paragraph from '../DocStructure/Paragraph';
import Frame from "./Frame";
export default class Root extends LinkedList<Frame> implements IRectangle, IDrawable {
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public em = new EventEmitter();

  private viewportPos: number = 0;
  private viewportHeight: number = 0;

  constructor(x?: number, y?: number) {
    super();
    if (x !== undefined) { this.x = x; }
    if (y !== undefined) { this.y = y; }
  }

  public setDocument(data: Document) {
    let current = data.head;
    while (current) {
      this.addParagraph(current);
      current = current.nextSibling;
    }
    data.em.addListener(EventName.DOCUMENT_PARAGRAPH_ADD, this.addParagraph.bind(this));
    this.em.emit(EventName.ROOT_UPDATE);
  }

  public addParagraph(paragraph: Paragraph, index?: number) {
    let pY = 0;
    if (this.tail !== null) {
      pY = Math.floor(this.tail.y + this.tail.height);
    }
    const frame = new Frame(paragraph, this.x, pY);
    if (index === undefined) {
      this.add(frame);
    } else {
      this.addAtIndex(frame, index);
    }
    const newSize = this.calSize();
    this.setSize(newSize.height, newSize.width);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    // ctx.textBaseline = 'hanging';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.translate(0, -this.viewportPos);
    let hasDraw = false;
    let current = this.head;
    const viewportPosEnd = this.viewportPos + this.viewportHeight;
    while (current) {
      if (
        (this.viewportPos <= current.y && current.y <= viewportPosEnd) ||
        (this.viewportPos <= current.y + current.height && current.y + current.height <= viewportPosEnd) ||
        (current.y < this.viewportPos && viewportPosEnd < current.y + current.height)
      ) {
        current.draw(ctx);
        hasDraw = true;
      }
      if (hasDraw && current.y + current.height < this.viewportPos) {
        current = null;
      } else {
        current = current.nextSibling;
      }
    }
    ctx.restore();
  }

  public destroy(): void {
    // TODO
    console.log('todo destroy render tree');
  }

  public setViewPortPos(pos: number) {
    this.viewportPos = pos;
  }

  public setViewPortHeight(height: number) {
    this.viewportHeight = height;
  }

  private setSize(height: number, width: number) {
    this.width = width;
    this.height = height;
    this.em.emit(EventName.ROOT_CHANGE_SIZE, { width: this.width, height: this.height });
  }

  private calSize() {
    let newWidth = 0;
    const newHeight = this.tail === null ? 0 : (this.tail.y + this.tail.height);
    this.children.forEach((item) => {
      newWidth = Math.max(newWidth, item.width);
    });
    return {
      width: newWidth,
      height: newHeight,
    };
  }
}
