import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { maxWidth } from '../Common/Platform';
import { EnumAlign } from '../DocStructure/EnumParagraphStyle';
import Fragment from '../DocStructure/Fragment';
import { FragmentDefaultAttributes } from '../DocStructure/FragmentAttributes';
import Frame from './Frame';
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
  public baseline: number = 0;

  private backgroundList: Array<{ start: number, end: number, background: string }> = [];
  private underlineList: Array<{ start: number, end: number, posY: number, color: string }> = [];
  private strikeList: Array<{ start: number, end: number, posY: number, color: string }> = [];

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }

  public add(run: Run) {
    super.add(run);
    run.em.on(EventName.RUN_CHANGE_SIZE, this.childrenSizeChangeHandler);

    const newWidth = this.width + run.width;
    const ls = run.solidHeight ? 1 : this.parent.paragraph.attributes.linespacing;
    const newHeight = Math.max(this.height, run.height * ls);
    const newBaseline = Math.max(this.baseline, run.frag.metrics.baseline * ls);
    this.setBaseline(newBaseline);
    this.setSize(newHeight, newWidth);
  }

  public removeAll() {
    this.children.forEach((r) => {
      r.em.off(EventName.RUN_CHANGE_SIZE, this.childrenSizeChangeHandler);
    });
    super.removeAll();
  }

  public draw(ctx: CanvasRenderingContext2D) {
    // 先画背景色
    this.backgroundList.forEach((item) => {
      ctx.fillStyle = item.background;
      ctx.fillRect(item.start, this.y, item.end - item.start, this.height);
    });

    // 再画内容
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].draw(ctx);
    }

    ctx.lineWidth = 1;
    // 画下划线
    this.underlineList.forEach((item) => {
      ctx.beginPath();
      ctx.moveTo(item.start, item.posY);
      ctx.lineTo(item.end, item.posY);
      ctx.strokeStyle = item.color;
      ctx.stroke();
    });
    // 画删除线
    this.strikeList.forEach((item) => {
      ctx.beginPath();
      ctx.moveTo(item.start, item.posY);
      ctx.lineTo(item.end, item.posY);
      ctx.strokeStyle = item.color;
      ctx.stroke();
    });

    // 最后绘制调试信息
    if ((window as any).lineBorder) {
      ctx.save();
      ctx.strokeStyle = 'red';
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }
  }

  public layout = () => {
    // line 的布局算法需要计算出此 line 中每个 run 的具体位置
    // 同时还需要计算此 line 中每一段背景色、下划线、删除线的起始位置

    let spaceWidth = 0;
    // 如果是两端对齐或者分散对齐，要先计算这个行的空格宽度，再做排版
    if ((this.parent.paragraph.attributes.align === EnumAlign.justify && this.nextSibling !== null) ||
      this.parent.paragraph.attributes.align === EnumAlign.scattered) {
      spaceWidth = (maxWidth - this.width) / (this.children.length - 1);
    }

    let backgroundStart = false;
    let backgroundRange = { start: 0, end: 0, background: '' };
    const underlinePosY = this.y + this.baseline + 2;
    let underlineStart = false;
    let underlineRange = { start: 0, end: 0, posY: underlinePosY, color: '' };
    let strikeStart = false;
    let strikeRange = { start: 0, end: 0, posY: 0, color: '' };
    let strikeFrag: Fragment | null = null;
    let currentRun = this.head;
    while (currentRun !== null) {
      currentRun.y = this.y + this.baseline - currentRun.frag.metrics.baseline;
      currentRun.x = currentRun.prevSibling === null ? 0 :
        (currentRun.prevSibling.x + currentRun.prevSibling.width + spaceWidth);

      if (backgroundStart) {
        if (currentRun.frag.attributes.background !== backgroundRange.background) {
          backgroundRange.end = currentRun.prevSibling.x + currentRun.prevSibling.width;
          this.backgroundList.push(backgroundRange);
          backgroundStart = false;
          backgroundRange = { start: 0, end: 0, background: '' };
          if (currentRun.frag.attributes.background !== FragmentDefaultAttributes.background) {
            backgroundRange.start = currentRun.x;
            backgroundRange.background = currentRun.frag.attributes.background;
            backgroundStart = true;
          }
        }
      } else {
        if (currentRun.frag.attributes.background !== FragmentDefaultAttributes.background) {
          backgroundRange.start = currentRun.x;
          backgroundRange.background = currentRun.frag.attributes.background;
          backgroundStart = true;
        }
      }

      if (underlineStart) {
        if (currentRun.frag.attributes.color !== underlineRange.color) {
          underlineRange.end = currentRun.prevSibling.x + currentRun.prevSibling.width;
          this.underlineList.push(underlineRange);
          underlineStart = false;
          underlineRange = { start: 0, end: 0, posY: underlinePosY, color: '' };
          if (currentRun.frag.attributes.underline !== FragmentDefaultAttributes.underline) {
            underlineRange.start = currentRun.x;
            underlineRange.color = currentRun.frag.attributes.color;
            underlineStart = true;
          }
        }
      } else {
        if (currentRun.frag.attributes.underline !== FragmentDefaultAttributes.underline) {
          underlineRange.start = currentRun.x;
          underlineRange.color = currentRun.frag.attributes.color;
          underlineStart = true;
        }
      }

      if (strikeStart) {
        if (currentRun.frag !== strikeFrag) {
          strikeRange.end = currentRun.prevSibling.x + currentRun.prevSibling.width;
          this.strikeList.push(strikeRange);
          strikeStart = false;
          strikeFrag = null;
          strikeRange = { start: 0, end: 0, posY: 0, color: '' };
          if (currentRun.frag.attributes.strike !== FragmentDefaultAttributes.strike) {
            strikeRange.start = currentRun.x;
            strikeRange.color = currentRun.frag.attributes.color;
            strikeRange.posY =
              currentRun.y + currentRun.frag.metrics.baseline -
              (currentRun.frag.metrics.emBottom - currentRun.frag.metrics.emTop) / 2;
            strikeStart = true;
            strikeFrag = currentRun.frag;
          }
        }
      } else {
        if (currentRun.frag.attributes.strike !== FragmentDefaultAttributes.strike) {
          strikeRange.start = currentRun.x;
          strikeRange.color = currentRun.frag.attributes.color;
          strikeRange.posY =
            currentRun.y + currentRun.frag.metrics.baseline -
            (currentRun.frag.metrics.emBottom - currentRun.frag.metrics.emTop) / 2;
          strikeStart = true;
          strikeFrag = currentRun.frag;
        }
      }

      currentRun = currentRun.nextSibling;
    }

    if (backgroundStart) {
      backgroundRange.end = this.tail.x + this.tail.width;
      this.backgroundList.push(backgroundRange);
    }
    if (underlineStart) {
      underlineRange.end = this.tail.x + this.tail.width;
      this.underlineList.push(underlineRange);
    }
    if (strikeStart) {
      strikeRange.end = this.tail.x + this.tail.width;
      this.strikeList.push(strikeRange);
    }
  }

  private childrenSizeChangeHandler = () => {
    const size = this.calSize();
    this.setBaseline(size.baseline);
    this.setSize(size.height, size.width);
  }

  private setSize(height: number, width: number) {
    this.width = width;
    this.height = height;
    this.em.emit(EventName.LINE_CHANGE_SIZE, { width: this.width, height: this.height });
  }

  private setBaseline(baseline: number) {
    this.baseline = baseline;
  }

  private calSize() {
    let newWidth = 0;
    let newHeight = 0;
    let newBaseline = 0;
    let newSolidHeight = 0;
    let newSolidBaseline = 0;
    this.children.forEach((item) => {
      newWidth += item.width;
      if (item.solidHeight) {
        newSolidHeight = Math.max(newSolidHeight, item.height);
        newSolidBaseline = Math.max(newSolidBaseline, item.frag.metrics.baseline);
      } else {
        newHeight = Math.max(newHeight, item.height);
        newBaseline = Math.max(newBaseline, item.frag.metrics.baseline);
      }
    });
    return {
      height: Math.max(newHeight * this.parent.paragraph.attributes.linespacing, newSolidHeight),
      width: newWidth,
      baseline: Math.max(newBaseline * this.parent.paragraph.attributes.linespacing, newSolidBaseline),
    };
  }
}
