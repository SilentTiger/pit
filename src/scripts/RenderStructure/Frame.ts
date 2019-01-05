import * as EventEmitter from 'eventemitter3';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import {  maxWidth } from '../Common/Platform';
import { guid } from "../Common/util";
import Fragment from '../DocStructure/Fragment';
import Paragraph from '../DocStructure/Paragraph';
import { EventName } from './EnumEventName';
import Line from "./Line";
import Root from "./Root";
import Run from './Run';
export default class Frame extends LinkedList<Line> implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public prevSibling: Frame;
  public nextSibling: Frame;
  public parent: Root;
  public readonly id: string = guid();
  public em = new EventEmitter();

  constructor(data: Paragraph, x: number, y: number) {
    super();
    if (x !== undefined) {
      this.x = x;
    }
    if (y !== undefined) {
      this.y = y;
    }
    this.add(new Line(this.x, this.y));
    let current = data.head;
    while (current) {
      this.addFragment(current);
      current = current.nextSibling;
    }
    this.setSize();
  }

  public add(line: Line) {
    super.add(line);
    line.em.on(EventName.CHANGE_SIZE, this.childrenSizeChangeHandler);
    this.setSize();
  }

  public addFragment = (fragment: Fragment) => {
    // 找到当前最后一个 line，判断这个 line 还能不能放下内容
    const lastLine = this.tail;
    let run = new Run(fragment, lastLine.x + lastLine.width, lastLine.y);
    let freeSpace = maxWidth - lastLine.x - lastLine.width;

    // 判断当前 fragment 是否能放得下
    if (run.width <= freeSpace) {
      lastLine.add(run);
    } else {
      // 如果当前行放不下，就看这个 frag 能不能分割，可以分割就分割，不能分割就创建新的 line 来放置
      if (fragment.canSplit()) {
        lastLine.add(run);
        let newFragment = run.split(freeSpace);
        while (newFragment !== null) {
          const newLine = new Line(this.x, lastLine.y + lastLine.height);
          freeSpace = maxWidth - newLine.x - newLine.width;
          run = new Run(newFragment, newLine.x, newLine.y);
          newFragment = run.split(freeSpace);
          newLine.add(run);
          this.add(newLine);
        }
      } else {
        const newLine = new Line(this.x, lastLine.y + lastLine.height);
        newLine.add(new Run(fragment, newLine.x, newLine.y));
        this.add(newLine);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.children.forEach((line) => {
      line.draw(ctx);
    });
  }

  private childrenSizeChangeHandler = () => {
    this.setSize();
  }

  private setSize() {
    let newWidth = 0;
    let newHeight = 0;
    this.children.forEach((item) => {
      newHeight += item.height;
      newWidth = Math.max(newWidth, item.width);
    });
    this.width = newWidth;
    this.height = newHeight;
    this.em.emit(EventName.CHANGE_SIZE, {width: this.width, height: this.height});
  }
}
