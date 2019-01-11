import * as EventEmitter from 'eventemitter3';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { maxWidth } from '../Common/Platform';
import { guid } from '../Common/util';
import Fragment from '../DocStructure/Fragment';
import Paragraph from '../DocStructure/Paragraph';
import { EventName } from './EnumEventName';
import Line from "./Line";
import Root from "./Root";
import { createRun } from './runFactory';

export default class Frame extends LinkedList<Line> implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public prevSibling: Frame = null;
  public nextSibling: Frame = null;
  public parent: Root;
  public paragraph: Paragraph;
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

    this.paragraph = data;
    this.add(new Line(this.x, this.y));
    let current = data.head;
    while (current) {
      this.addFragment(current);
      current = current.nextSibling;
    }
    this.children.forEach((l) => {
      l.layout();
    });
    this.setSize();
  }

  public add(line: Line) {
    super.add(line);
    line.em.on(EventName.CHANGE_SIZE, this.childrenSizeChangeHandler);
    this.setSize();
  }

  public addFragment = (fragment: Fragment) => {
    // 找到当前最后一个 line，判断这个 line 还能不能放下内容
    const run = createRun(fragment, this.tail.x + this.tail.width, this.tail.y);
    let freeSpace = maxWidth - this.tail.x - this.tail.width;

    // 判断当前 fragment 是否能放得下
    if (run.width <= freeSpace) {
      this.tail.add(run);
    } else {
      // 如果当前行放不下，就看这个 frag 能不能分割，可以分割就分割，不能分割就创建新的 line 来放置
      if (fragment.canSplit(freeSpace)) {
        this.tail.add(run);
        let newRun = run.split(freeSpace);
        while (newRun !== null) {
          const newLine = new Line(this.x, this.tail.y + this.tail.height);
          freeSpace = maxWidth - newLine.x - newLine.width;
          newRun.setPosition(newLine.x, newLine.y);

          const tmpNewRun = newRun.split(freeSpace, true);  // 新行里面的 run 可以 break word 断行
          newLine.add(newRun);
          this.add(newLine);
          newRun = tmpNewRun;
        }
      } else {
        const newLine = new Line(this.x, this.tail.y + this.tail.height);
        run.setPosition(newLine.x, newLine.y);
        newLine.add(run);
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
    this.em.emit(EventName.CHANGE_SIZE, { width: this.width, height: this.height });
  }
}
