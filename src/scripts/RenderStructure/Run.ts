import { ILinkedListNode } from "../Common/LinkedList";
import Line from "./Line";

export default class Run implements ILinkedListNode {
  public prevSibling: Run;
  public nextSibling: Run;
  public parent: Line;
}
