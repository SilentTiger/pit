import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { LinkedList } from "../Common/LinkedList";
import Document from '../DocStructure/Document';
import Paragraph from '../DocStructure/Paragraph';
import Frame from "./Frame";
export default class Root extends LinkedList<Frame> implements IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public em = new EventEmitter();

  constructor(data: Document, x?: number, y?: number) {
    super();
    if (x !== undefined) {
      this.x = x;
    }
    if (y !== undefined) {
      this.y = y;
    }
    let current = data.head;
    while (current) {
      this.addParagraph(current);
      current = current.nextSibling;
    }
    data.em.addListener(EventName.DOCUMENT_ADD_PARA, this.addParagraph.bind(this));
  }

  public addParagraph(paragraph: Paragraph) {
    let pY = 0;
    if (this.tail !== null) {
      pY = Math.round(this.tail.y + this.tail.height);
    }
    const frame = new Frame(paragraph, this.x, pY);
    this.add(frame);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.textBaseline = 'hanging';
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].draw(ctx);
    }
  }
}
