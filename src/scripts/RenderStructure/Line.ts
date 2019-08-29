import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import ICanvasContext from '../Common/ICanvasContext';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import { LinkedList } from "../Common/LinkedList";
import { convertPt2Px } from '../Common/Platform';
import { EnumAlign } from '../DocStructure/EnumParagraphStyle';
import Fragment from '../DocStructure/Fragment';
import { FragmentDefaultAttributes } from '../DocStructure/FragmentAttributes';
import Run from "./Run";
import RunText from './RunText';

export default class Line extends LinkedList<Run> implements IRectangle, IDrawable {
  public start: number = 0;
  public length: number = 0;
  public x: number;
  public y: number;
  public width: number = 0;
  public height: number = 0;
  public em = new EventEmitter();
  public baseline: number = 0;
  public linespacing: number = 1.7;
  public maxWidth: number = 0;

  private minBaseline = 0;
  private minHeight = 0;

  private backgroundList: Array<{ start: number, end: number, background: string }> = [];
  private underlineList: Array<{ start: number, end: number, posY: number, color: string }> = [];
  private strikeList: Array<{ start: number, end: number, posY: number, color: string }> = [];

  constructor(
    x: number, y: number,
    linespacing: number, maxWidth: number,
    minBaseline: number = 0, minHeight: number = 0,
  ) {
    super();
    this.x = x;
    this.y = y;
    this.linespacing = linespacing;
    this.maxWidth = maxWidth;
    this.minBaseline = minBaseline;
    this.minHeight = minHeight;
  }

  public destroy() {
    // todo
  }

  public add(run: Run) {
    super.add(run);

    const newWidth = this.width + run.width;
    const ls = run.solidHeight ? 1 : this.linespacing;
    const runHeight = run instanceof RunText ? convertPt2Px[run.frag.attributes.size] : run.height;
    const newHeight = Math.max(this.height, runHeight * ls);
    const newBaseline = Math.max(this.baseline, (newHeight - run.frag.metrics.bottom) / 2 + run.frag.metrics.baseline);
    this.setBaseline(newBaseline);
    this.setSize(newHeight, newWidth);
    this.length += run.length;
  }

  /**
   * 绘制一行内容
   * @param ctx ICanvasContext
   * @param x 绘制位置的 x 坐标
   * @param y 绘制位置的 y 坐标
   */
  public draw(
    ctx: ICanvasContext,
    x: number,
    y: number,
  ) {
    // 先画背景色
    this.backgroundList.forEach((item) => {
      ctx.fillStyle = item.background;
      ctx.fillRect(item.start + this.x + x, this.y + y, item.end - item.start, this.height);
    });

    // 再画内容
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].draw(ctx, this.x + x, this.y + y);
    }

    ctx.lineWidth = 1;
    // 画下划线
    this.underlineList.forEach((item) => {
      ctx.beginPath();
      ctx.moveTo(item.start + this.x + x, item.posY + y);
      ctx.lineTo(item.end + this.x + x, item.posY + y);
      ctx.strokeStyle = item.color;
      ctx.stroke();
    });
    // 画删除线
    this.strikeList.forEach((item) => {
      ctx.beginPath();
      ctx.moveTo(item.start + this.x + x, item.posY + y);
      ctx.lineTo(item.end + this.x + x, item.posY + y);
      ctx.strokeStyle = item.color;
      ctx.stroke();
    });

    // 最后绘制调试信息
    if ((window as any).lineBorder) {
      ctx.save();
      ctx.strokeStyle = 'red';
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height);
      ctx.restore();
    }
  }

  public layout = (align: EnumAlign) => {
    // line 的布局算法需要计算出此 line 中每个 run 的具体位置
    // 同时还需要计算此 line 中每一段背景色、下划线、删除线的起始位置

    let startX = 0;
    let spaceWidth = 0;

    switch (align) {
      case EnumAlign.left:
      case EnumAlign.scattered:
        startX = 0;
        break;
      case EnumAlign.justify:
        spaceWidth = (this.maxWidth - this.width) / (this.children.length - 1);
        startX = 0;
        break;
      case EnumAlign.center:
        startX = (this.maxWidth - this.children.reduce((totalWidth, cur: Run) => totalWidth + cur.width, 0)) / 2;
        break;
      case EnumAlign.right:
        startX = this.maxWidth - this.children.reduce((totalWidth, cur: Run) => totalWidth + cur.width, 0);
        break;
    }

    let backgroundStart = false;
    let backgroundRange = { start: startX, end: 0, background: '' };
    const underlinePosY = this.y + this.baseline + 2;
    let underlineStart = false;
    let underlineRange = { start: startX, end: 0, posY: this.calClearPosY(underlinePosY), color: '' };
    let strikeStart = false;
    let strikeRange = { start: startX, end: 0, posY: 0.5, color: '' };
    let strikeFrag: Fragment | null = null;
    let currentRun = this.head;
    while (currentRun !== null) {
      currentRun.y = this.baseline - currentRun.frag.metrics.baseline;
      currentRun.x = currentRun.prevSibling === null ? startX :
        (currentRun.prevSibling.x + currentRun.prevSibling.width + spaceWidth);

      if (backgroundStart) {
        if (currentRun.frag.attributes.background !== backgroundRange.background) {
          if (currentRun.prevSibling !== null) {
            backgroundRange.end = currentRun.prevSibling.x + currentRun.prevSibling.width;
          } else {
            backgroundRange.end = currentRun.x;
          }
          this.backgroundList.push(backgroundRange);
          backgroundStart = false;
          backgroundRange = { start: startX, end: 0, background: '' };
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
        if (currentRun.frag.attributes.color !== underlineRange.color || !currentRun.frag.attributes.underline) {
          if (currentRun.prevSibling !== null) {
            underlineRange.end = currentRun.prevSibling.x + currentRun.prevSibling.width;
          } else {
            underlineRange.end = currentRun.x;
          }
          this.underlineList.push(underlineRange);
          underlineStart = false;
          underlineRange = { start: startX, end: 0, posY: this.calClearPosY(underlinePosY), color: '' };
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
          if (currentRun.prevSibling !== null) {
            strikeRange.end = currentRun.prevSibling.x + currentRun.prevSibling.width;
          } else {
            strikeRange.end = currentRun.x;
          }
          this.strikeList.push(strikeRange);
          strikeStart = false;
          strikeFrag = null;
          strikeRange = { start: startX, end: 0, posY: 0.5, color: '' };
          if (currentRun.frag.attributes.strike !== FragmentDefaultAttributes.strike) {
            strikeRange.start = currentRun.x;
            strikeRange.color = currentRun.frag.attributes.color;
            strikeRange.posY = this.calClearPosY(
              this.y + this.baseline -
              (currentRun.frag.metrics.baseline - currentRun.frag.metrics.xTop) / 2);
            strikeStart = true;
            strikeFrag = currentRun.frag;
          }
        }
      } else {
        if (currentRun.frag.attributes.strike !== FragmentDefaultAttributes.strike) {
          strikeRange.start = currentRun.x;
          strikeRange.color = currentRun.frag.attributes.color;
          strikeRange.posY =  this.calClearPosY(
            this.y + this.baseline -
            (currentRun.frag.metrics.baseline - currentRun.frag.metrics.xTop) / 2);
          strikeStart = true;
          strikeFrag = currentRun.frag;
        }
      }

      currentRun = currentRun.nextSibling;
    }

    if (backgroundStart) {
      backgroundRange.end = this.tail!.x + this.tail!.width;
      this.backgroundList.push(backgroundRange);
    }
    if (underlineStart) {
      underlineRange.end = this.tail!.x + this.tail!.width;
      this.underlineList.push(underlineRange);
    }
    if (strikeStart) {
      strikeRange.end = this.tail!.x + this.tail!.width;
      this.strikeList.push(strikeRange);
    }

    if (this.tail !== null) {
      this.setSize(this.height, this.tail.x + this.tail.width);
    }
  }

  private setSize(height: number, width: number) {
    this.width = width;
    this.height = Math.max(this.minHeight, height);
    this.em.emit(EventName.LINE_CHANGE_SIZE, { width: this.width, height: this.height });
  }

  private setBaseline(baseline: number) {
    this.baseline = Math.max(baseline, this.minBaseline);
  }

  /**
   * 根据原始 y 坐标计算出一个可以在高分屏上清晰绘制的 y 坐标
   * @param posY 原始 y 坐标
   */
  private calClearPosY(posY: number) {
    // 在高分屏上，如果 y 坐标时一个整数，在这个坐标上绘制一条水平方向的直线
    // 这条直接就是模糊的，所以需要向下取整让加上 0.5 使得这条直线变清晰
    return Math.floor(posY) + 0.5;
  }
}
