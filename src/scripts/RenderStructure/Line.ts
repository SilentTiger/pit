import * as EventEmitter from 'eventemitter3';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { EventName } from './EnumEventName';
import Frame from "./Frame";
import Run from "./Run";
export default class Line extends LinkedList<Run> implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number = 0;
  public height: number = 0;
  public prevSibling: Line;
  public nextSibling: Line;
  public parent: Frame;
  public em = new EventEmitter();

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }

  public add(run: Run) {
    super.add(run);
    run.em.on(EventName.CHANGE_SIZE, this.childrenSizeChangeHandler);
    this.setSize();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.children.forEach((run) => {
      run.draw(ctx);
    });
  }

  private childrenSizeChangeHandler = () => {
    this.setSize();
  }

  private setSize() {
    let newWidth = 0;
    let newHeight = 0;
    this.children.forEach((item) => {
      newWidth += item.width;
      newHeight = Math.max(newHeight, item.height);
    });
    this.width = newWidth;
    this.height = newHeight;
    this.em.emit(EventName.CHANGE_SIZE, {width: this.width, height: this.height});
  }
}
