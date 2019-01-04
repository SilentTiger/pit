import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Fragment from "../DocStructure/Fragment";
import Line from "./Line";

export default class Run implements ILinkedListNode, IRectangle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public prevSibling: Run;
  public nextSibling: Run;
  public parent: Line;
  public frag: Fragment;

  constructor(fragment: Fragment, x: number, y: number) {
    this.frag = fragment;
    this.x = x;
    this.y = y;
    this.setSize();
  }

  public setSize = () => {
    const size = this.calSize();
    this.width = size.width;
    this.height = size.height;
  }

  public calSize = () => {
    return this.frag.calSize();
  }

  public split = (freeSpace: number): null | Fragment => {
    const newFrag = this.frag.split(freeSpace);
    this.setSize();
    return newFrag;
  }
}
