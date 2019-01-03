import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import Frame from "./Frame";
import Run from "./Run";
export default class Line extends LinkedList<Run> implements ILinkedListNode, IRectangle {
  public x: number;
  public y: number;
  public width: number = 0;
  public height: number = 0;
  public prevSibling: Line;
  public nextSibling: Line;
  public parent: Frame;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}
