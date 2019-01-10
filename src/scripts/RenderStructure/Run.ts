import * as EventEmitter from "eventemitter3";
import { IDrawable } from "../Common/IDrawable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Fragment from "../DocStructure/Fragment";
import { EventName } from "./EnumEventName";
import Line from "./Line";

export default class Run
  implements ILinkedListNode, IRectangle, IDrawable {
  public draw: (ctx: CanvasRenderingContext2D) => void;
  public split: (freeSpace: number, breakWord?: boolean) => null | Run;
  public separate: () => Run[];
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public prevSibling: Run = null;
  public nextSibling: Run = null;
  public parent: Line;
  public frag: Fragment;
  public em = new EventEmitter();

  constructor(fragment: Fragment, x: number, y: number) {
    this.frag = fragment;
    this.x = x;
    this.y = y;
  }

  public setSize = () => {
    const size = this.calSize();
    this.width = size.width;
    this.height = size.height;
    this.em.emit(EventName.CHANGE_SIZE, size);
  }

  public calSize = () => {
    return this.frag.calSize();
  }

  public setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
