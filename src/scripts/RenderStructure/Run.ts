import * as EventEmitter from "eventemitter3";
import { IDrawable } from "../Common/IDrawable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Fragment from "../DocStructure/Fragment";
import { EventName } from "./EnumEventName";
import Line from "./Line";

export default abstract class Run implements ILinkedListNode, IRectangle, IDrawable {
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

  public abstract draw(ctx: CanvasRenderingContext2D): void;
  public abstract calHeight(): number;
  public abstract calWidth(): number;

  public setSize = (height: number, width: number) => {
    this.width = width;
    this.height = height;
    this.em.emit(EventName.CHANGE_SIZE, { height, width });
  }

  public calSize = () => {
    return {
      height: this.calHeight(),
      width: this.calWidth(),
    };
  }

  public setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
