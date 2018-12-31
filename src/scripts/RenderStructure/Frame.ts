import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { guid } from "../Common/Util";
import Paragraph from '../DocStructure/Paragraph';
import Line from "./Line";
import Root from "./Root";
export default class Frame extends LinkedList<Line> implements ILinkedListNode {
  public prevSibling: Frame;
  public nextSibling: Frame;
  public parent: Root;
  public readonly id: string = guid();
  constructor(paragraph: Paragraph) {
    super();
  }
}
