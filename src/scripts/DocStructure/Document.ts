import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import ICanvasContext from '../Common/ICanvasContext';
import IRange from '../Common/IRange';
import IRectangle from '../Common/IRectangle';
import {LinkedList} from '../Common/LinkedList';
import { requestIdleCallback } from '../Common/Platform';
import { splitIntoBat } from '../Common/util';
import editorConfig from '../IEditorConfig';
import Attachment from './Attachment';
import Block from './Block';
import CodeBlock from './CodeBlock';
import Divide from './Divide';
import Fragment from './Fragment';
import FragmentDate from './FragmentDate';
import FragmentImage from './FragmentImage';
import FragmentParaEnd from './FragmentParaEnd';
import FragmentText from './FragmentText';
import LayoutFrame from './LayoutFrame';
import ListItem from './ListItem';
import Location from './Location';
import Paragraph from './Paragraph';
import QuoteBlock from './QuoteBlock';
import Table from './Table';

export enum EnumBlockType {
  Paragraph = 'Paragraph',
  QuoteBlock = 'QuoteBlock',
  CodeBlock = 'CodeBlock',
  Divide = 'Divide',
  ListItem = 'ListItem',
  Location = 'Location',
  Attachment = 'Attachment',
  Table = 'Table',
}
export default class Document extends LinkedList<Block> {
  public em: EventEmitter = new EventEmitter();
  public width: number = 0;
  public height: number = 0;
  public length: number = 0;
  public selectionRectangles: IRectangle[] = [];
  private idleLayoutQueue: Block[] = [];
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private _selection: IRange | null = null;

  get selection(): IRange | null {
    return this._selection;
  }

  public readFromChanges = (changes: any[]) => {
    this.clear();

    const cache: Array<{ type: EnumBlockType, frames: any[][] }> = [];
    let frameCache = [];
    for (let i = 0, l = changes.length; i < l; i++) {
      const thisDataType = this.getBlockTypeFromChange(changes[i]);
      frameCache.push(changes[i]);
      if (thisDataType !== null) {
        cache.push({
          type: thisDataType,
          frames: [frameCache],
        });
        frameCache = [];
      }
    }

    for (let i = cache.length - 1; i > 0; i--) {
      const { type } = cache[i];
      if (type === cache[i - 1].type) {
        if (
          type === EnumBlockType.QuoteBlock ||
          type === EnumBlockType.CodeBlock
        ) {
          cache[i - 1].frames = cache[i - 1].frames.concat(cache[i].frames);
          cache.splice(i, 1);
        }
      }
    }

    for (let i = 0, l = cache.length; i < l; i++) {
      const currentBat = cache[i];
      switch (currentBat.type) {
        case EnumBlockType.Divide:
          this.add(new Divide(editorConfig.canvasWidth));
          break;
        case EnumBlockType.Location:
          this.add(new Location(currentBat.frames[0][0].data.location));
          break;
        case EnumBlockType.Attachment:
          this.add(new Attachment(currentBat.frames[0][0].data.attachment, currentBat.frames[0][0].attributes));
          break;
        case EnumBlockType.Table:
          this.add(new Table());
          break;
        case EnumBlockType.Paragraph:
          const frame = new LayoutFrame(
            currentBat.frames[0].map((change) => this.getFragmentFromChange(change)),
            currentBat.frames[0].slice(-1)[0].attributes,
            editorConfig.canvasWidth,
          );
          this.add(new Paragraph(frame, editorConfig.canvasWidth));
          break;
        case EnumBlockType.QuoteBlock:
          const quoteFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromChange(change)),
              bat.slice(-1)[0].attributes,
              editorConfig.canvasWidth - 20,
            );
          });
          this.add(new QuoteBlock(quoteFrames));
          break;
        case EnumBlockType.ListItem:
          const listItemAttributes = currentBat.frames.slice(-1)[0].slice(-1)[0].attributes;

          const frameBat = splitIntoBat(currentBat.frames[0], (cur: any) => {
              return typeof cur.data === 'object' && cur.data['inline-break'] === true;
            });

          const frames = frameBat.map((b) => {
              const frags = b.map((change: any) => this.getFragmentFromChange(change));
              return new LayoutFrame(frags, {}, 616);
            });

          this.add(new ListItem(frames, listItemAttributes, editorConfig.canvasWidth));
          break;
        case EnumBlockType.CodeBlock:
          const codeFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromChange(change)),
              bat.slice(-1)[0].attributes, editorConfig.canvasWidth,
            );
          });
          this.add(new CodeBlock(codeFrames));
          break;
      }
    }

    if (this.head !== null) {
      this.head.setStart(0, true, true);
    }
  }

  /**
   * 清除当前文档中的所有数据
   */
  public clear() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].destroy();
    }
    this.removeAll();
  }

  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number, force = true) {
    this.startDrawingBlock = null;
    this.endDrawingBlock = null;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    let current = this.head;
    const viewportPosEnd = scrollTop + viewHeight;
    // 绘制的主要逻辑是，当前视口前面的内容只用排版不用绘制
    // 当前视口中的内容排版并绘制
    // 当前视口后面的内容，放到空闲队列里面排版
    while (current !== null) {
      if (current.y < viewportPosEnd) {
        current.layout();
        if (current.y + current.height >= scrollTop) {
          current.draw(ctx, scrollTop);
          if (this.startDrawingBlock === null) {
            this.startDrawingBlock = current;
          }
        }
      } else if (current.needLayout) {
        // 当前视口后面的内容，放到空闲队列里面排版
        this.startIdleLayout(current);
        this.endDrawingBlock = current;
        break;
      }
      current = current.nextSibling;
    }

    // 绘制选区
    if (this.selectionRectangles.length > 0) {
      ctx.drawSelectionArea(this.selectionRectangles, scrollTop);
    }
    ctx.restore();
  }

  public getLength(): number {
    return this.children.reduce((sum, currentBlock: Block) => {
      return sum + currentBlock.length;
    }, 0);
  }

  public destroy(): void {
    // TODO
    console.log('todo destroy document');
  }

  public setSize(size: { height?: number, width?: number }) {
    let changed = false;
    if (size.height) {
      this.height = size.height;
      changed = true;
    }
    if (size.width) {
      this.width = size.width;
      changed = true;
    }
    if (changed) {
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height });
    }
  }

  public getDocumentPos = (x: number, y: number): number => {
    let targetChild;
    if (y < 0) {
      targetChild = this.head;
    } else if (y > this.height) {
      targetChild = this.tail;
    } else {
      targetChild = this.findChildrenInPos(x, y);
    }
    if (targetChild === null) { return -1; }
    return targetChild.getDocumentPos(x, y) + targetChild.start;
  }

  /**
   * 设置文档选区
   * @param index 位置索引
   * @param length 选区长度
   */
  public setSelection(index: number, length: number): boolean {
    if (this._selection === null ||
      (this._selection !== null && (this._selection.index !== index || this._selection.length !== length))) {
      let rects: IRectangle[] = [];
      let current = 0;
      let end = this.children.length;
      let step = 1;
      if (index >= this.length / 2) {
        current = this.children.length - 1;
        end = -1;
        step = -1;
      }

      let found = false;
      for (; current !== end;) {
        const element = this.children[current];
        if (
          (element.start <= index && index < element.start + element.length) ||
          (element.start <= index + length && index + length < element.start + element.length) ||
          (index <= element.start && element.start + element.length <= index + length)
        ) {
          found = true;
          rects = rects.concat(element.getSelectionRectangles(index, length));
          current += step;
        } else {
          if (found) {
            break;
          } else {
            current += step;
            continue;
          }
        }
      }

      this._selection = { index, length };
      this.selectionRectangles = rects;
      this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION, this._selection);
      return true;
    }
    return false;
  }

  private findChildrenInPos(x: number, y: number): Block | null {
    let current = this.head;
    if (current !== null) {
      while (current !== null && (y < current.y || y > current.y + current.height)) {
        current = current.nextSibling === this.endDrawingBlock ? null : current.nextSibling;
      }
    }
    return current;
  }

  /**
   * 计算某条 change 数据对应的 block type，null 表示普通行内数据
   * @param structData 结构化的 change 数据
   */
  private getBlockTypeFromChange(structData: any): EnumBlockType | null {
    let thisBlockType = null;
    if (structData.data === '\n') {
      if (structData.attributes && structData.attributes.blockquote) {
        thisBlockType = EnumBlockType.QuoteBlock;
      } else if (structData.attributes && structData.attributes['code-block']) {
        thisBlockType = EnumBlockType.CodeBlock;
      } else if (structData.attributes && (structData.attributes['list-id'] || structData.attributes['bullet-id'])) {
        thisBlockType = EnumBlockType.ListItem;
      } else {
        thisBlockType = EnumBlockType.Paragraph;
      }
    } else if (structData.data.location) {
      thisBlockType = EnumBlockType.Location;
    } else if (structData.data.attachment) {
      thisBlockType = EnumBlockType.Attachment;
    } else if (structData.data.divide) {
      thisBlockType = EnumBlockType.Divide;
    } else if (structData.data.rows && structData.data.cols) {
      thisBlockType = EnumBlockType.Table;
    }

    return thisBlockType;
  }

  /**
   * 根据 change 信息生成 fragment
   */
  private getFragmentFromChange(structData: any): Fragment {
    // 如果 data 是字符串说明是文字性内容
    if (typeof structData.data === 'string') {
      if (structData.data !== '\n') {
        // 如果不是换行符说明是普通内容
        return new FragmentText(structData.attributes, structData.data);
      } else {
        return new FragmentParaEnd();
      }
    } else if (typeof structData.data === 'object') {
      if (structData.data['gallery-block'] !== undefined || structData.data.gallery !== undefined) {
        // 如果 gallery-block 存在说明是图片
        return new FragmentImage(structData.attributes, structData.data.gallery || structData.data['gallery-block']);
      } else if (structData.data['date-mention'] !== undefined) {
        // 如果 date-mention 存在说明是日期
        return new FragmentDate(structData.attributes, structData.data['date-mention']);
      } else if (structData.data['inline-break'] === true) {
        // 如果是 list item 里的换行
        return new FragmentParaEnd();
      }
    }
    throw new Error('unknown fragment');
  }

  private startIdleLayout(block: Block) {
    this.idleLayoutQueue.push(block);
    if (!this.idleLayoutRunning) {
      requestIdleCallback(this.runIdleLayout);
    }
  }

  private runIdleLayout = (deadline: {timeRemaining: () => number, didTimeout: boolean}) => {
    if (this.idleLayoutQueue.length > 0) {
      this.idleLayoutRunning = true;
      let currentBlock: Block | undefined | null = this.idleLayoutQueue.shift();
      while (deadline.timeRemaining() > 3 && currentBlock !== undefined && currentBlock !== null) {
        if (currentBlock.needLayout) {
          currentBlock.layout();
          currentBlock = currentBlock.nextSibling;
        } else {
          currentBlock = null;
          break;
        }
      }

      if (currentBlock !== null && currentBlock !== undefined) {
        // 说明还没有排版完成
        this.idleLayoutQueue.unshift(currentBlock);
      }
      setTimeout(() => {
        requestIdleCallback(this.runIdleLayout);
      }, 4);
    } else {
      this.idleLayoutRunning = false;
      console.log('idle finished', performance.now());
    }
  }
}
