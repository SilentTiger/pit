import * as EventEmitter from 'eventemitter3';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { maxWidth } from '../Common/Platform';
import { EnumAlign } from '../DocStructure/EnumParagraphStyle';
import { EventName } from './EnumEventName';
import Frame from "./Frame";
import Run from "./Run";

export default class Line extends LinkedList<Run> implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number = 0;
  public height: number = 0;
  public prevSibling: Line = null;
  public nextSibling: Line = null;
  public parent: Frame;
  public em = new EventEmitter();
  public spaceWidth: number;

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

  public removeAll() {
    this.children.forEach((r) => {
      r.em.off(EventName.CHANGE_SIZE, this.childrenSizeChangeHandler);
    });
    super.removeAll();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.children.forEach((run) => {
      run.draw(ctx);
    });
  }

  public layout = () => {
    let spaceWidth = 0;
    // 如果是两端对齐或者分散对齐，要先计算这个行的空格宽度，再做排版
    if ((this.parent.paragraph.attributes.align === EnumAlign.justify && this.nextSibling !== null) ||
      this.parent.paragraph.attributes.align === EnumAlign.scattered) {
      spaceWidth = (maxWidth - this.width) / (this.children.length - 1);
    }
    let currentRun = this.head;
    while (currentRun !== null) {
      currentRun.y = this.y;
      currentRun.x = currentRun.prevSibling === null ? 0 :
        (currentRun.prevSibling.x + currentRun.prevSibling.width + spaceWidth);
      currentRun = currentRun.nextSibling;
    }
  }

  private childrenSizeChangeHandler = () => {
    this.setSize();
  }

  private setSize() {
    let newWidth = 0;
    let newHeight = 0;
    this.children.forEach((item) => {
      newHeight = Math.max(newHeight, item.height);
      newWidth += item.width;
    });
    this.width = newWidth;
    this.height = newHeight;
    this.em.emit(EventName.CHANGE_SIZE, {width: this.width, height: this.height});
  }
}
