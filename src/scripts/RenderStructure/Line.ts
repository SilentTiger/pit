import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import Frame from "./Frame";
import Run from "./Run";
export default class Line extends LinkedList<Run> implements ILinkedListNode {
  public prevSibling: Line;
  public nextSibling: Line;
  public parent: Frame;
}
