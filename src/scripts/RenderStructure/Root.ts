import { LinkedList } from "../Common/LinkedList";
import Document from '../DocStructure/Document';
import Paragraph from '../DocStructure/Paragraph';
import Frame from "./Frame";
export default class Root extends LinkedList<Frame> {
  constructor(data: Document) {
    super();
    const current = data.head;
    while (current) {
      this.addParagraph(current.value);
    }
  }

  public addParagraph(paragraph: Paragraph) {
    const frame = new Frame(paragraph);
    this.add(frame);
  }
}
