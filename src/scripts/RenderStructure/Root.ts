import IRectangle from '../Common/IRectangle';
import { LinkedList } from "../Common/LinkedList";
import Document from '../DocStructure/Document';
import Paragraph from '../DocStructure/Paragraph';
import Frame from "./Frame";
export default class Root extends LinkedList<Frame> implements IRectangle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  constructor(data: Document, x?: number, y?: number) {
    super();
    if (x !== undefined) {
      this.x = x;
    }
    if (y !== undefined) {
      this.y = y;
    }
    const current = data.head;
    while (current) {
      this.addParagraph(current);
    }
  }

  public addParagraph(paragraph: Paragraph) {
    let pY = 0;
    if (this.tail !== null) {
      pY = this.tail.y + this.tail.height;
    }
    const frame = new Frame(paragraph, this.x, pY);
    this.add(frame);
  }
}
