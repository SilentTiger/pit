import Document from "../DocStructure/Document";
import Paragraph from "../DocStructure/Paragraph";
import Frame from "./Frame";
import LayoutTree from "./LayoutTree";
export default class Engine {
  public readonly layoutTree: LayoutTree = new LayoutTree();

  constructor(data: Document) {
    let currentParagraph = data.head;
    while (currentParagraph) {
      this.addParagraph(currentParagraph.value);
      currentParagraph = currentParagraph.nextSibling;
    }
  }

  public addParagraph = (paragraph: Paragraph) => {
    // todo
  }
}
