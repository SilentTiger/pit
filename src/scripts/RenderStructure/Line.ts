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
    // 如果是两端对齐或者分散对齐，就吧 run 全部拆开，并分别计算每个 run 的位置
    if ((this.parent.paragraph.attributes.align === EnumAlign.just && this.nextSibling !== null) ||
      this.parent.paragraph.attributes.align === EnumAlign.scattered ) {
        let allRun: Run[] = [];
        this.children.forEach((run) => {
          allRun = allRun.concat(run.separate());
        });
        let freeSpace = maxWidth;
        allRun.forEach((r) => {
          freeSpace -= r.width;
        });
        const separatorSpace = freeSpace / (allRun.length - 1);
        let newX = 0;
        allRun.forEach((r) => {
          r.x = newX;
          newX += r.width + separatorSpace;
        });

        this.removeAll();
        this.addAll(allRun);
      }
  }

  private childrenSizeChangeHandler = () => {
    this.setSize();
  }

  private setSize() {
    let newWidth = 0;
    let newHeight = 0;
    this.children.forEach((item, index, arr) => {
      newHeight = Math.max(newHeight, item.height);
      if (index === arr.length - 1) {
        newWidth = item.x + item.width;
      }
    });
    this.width = newWidth;
    this.height = newHeight;
    this.em.emit(EventName.CHANGE_SIZE, {width: this.width, height: this.height});
  }
}
