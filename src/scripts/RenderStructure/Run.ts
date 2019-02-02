import * as EventEmitter from "eventemitter3";
import { EventName } from "../Common/EnumEventName";
import { IDrawable } from "../Common/IDrawable";
import IRectangle from "../Common/IRectangle";
import { ILinkedListNode } from "../Common/LinkedList";
import Fragment from "../DocStructure/Fragment";
import Line from "./Line";

export default abstract class Run implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public solidHeight: boolean = false;  // 固定高度，只该元素实际占用高度不受 line 元素的 行高等条件影响
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
    this.em.emit(EventName.RUN_CHANGE_SIZE, { height, width });
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
