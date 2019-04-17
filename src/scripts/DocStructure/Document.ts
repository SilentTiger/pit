import * as EventEmitter from 'eventemitter3';
import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { EventName } from '../Common/EnumEventName';
import ICanvasContext from '../Common/ICanvasContext';
import IExportable from '../Common/IExportable';
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
export default class Document extends LinkedList<Block> implements IExportable {
  public em: EventEmitter = new EventEmitter();
  public width: number = 0;
  public height: number = 0;
  public length: number = 0;
  public selectionRectangles: IRectangle[] = [];
  public delta = new Delta();
  public history: Array<{undo: Delta, redo: Delta}> = [];
  private idleLayoutQueue: Block[] = [];
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private _selection: IRange | null = null;

  get selection(): IRange | null {
    return this._selection;
  }

  public readFromChanges = (delta: Delta) => {
    this.clear();
    this.delta = delta;
    const cache: Array<{ type: EnumBlockType; frames: Op[][] }> = [];
    let frameCache: Op[] = [];

    delta.forEach((op) => {
      const thisDataType = this.getBlockTypeFromOp(op);
      frameCache.push(op);
      if (thisDataType !== null) {
        cache.push({
          type: thisDataType,
          frames: [frameCache],
        });
        frameCache = [];
      }
    });

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
          const locationData = currentBat.frames[0][0].insert as any;
          this.add(new Location(locationData.location));
          break;
        case EnumBlockType.Attachment:
          const attachmentData = currentBat.frames[0][0].insert as any;
          this.add(new Attachment(attachmentData.attachment, currentBat.frames[0][0].attributes));
          break;
        case EnumBlockType.Table:
          this.add(new Table());
          break;
        case EnumBlockType.Paragraph:
          const frame = new LayoutFrame(
            currentBat.frames[0].map((change) => this.getFragmentFromOp(change)),
            currentBat.frames[0].slice(-1)[0].attributes,
            editorConfig.canvasWidth,
          );
          this.add(new Paragraph(frame, editorConfig.canvasWidth));
          break;
        case EnumBlockType.QuoteBlock:
          const quoteFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromOp(change)),
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
              const frags = b.map((change: any) => this.getFragmentFromOp(change));
              return new LayoutFrame(frags, {}, 616);
            });

          this.add(new ListItem(frames, listItemAttributes, editorConfig.canvasWidth));
          break;
        case EnumBlockType.CodeBlock:
          const codeFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromOp(change)),
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
    this.delta = new Delta();
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
      this.selectionRectangles = [];
      this.findBlocksByRange(index, length).forEach((block) => {
        this.selectionRectangles = this.selectionRectangles.concat(block.getSelectionRectangles(index, length));
      });
      this._selection = { index, length };
      this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION, this._selection);
      return true;
    }
    return false;
  }

  public delete(index: number, length: number) {
    const blocks = this.findBlocksByRange(index, length);
    blocks.forEach((block) => {
      const offset = index - block.start;
      block.delete(offset, Math.max(block.length, length ));
    });
  }

  public toDelta(): Delta {
    return this.children.reduce((delta: Delta, block: Block) => {
      return delta.concat(block.toDelta());
    }, new Delta());
  }

  public toHtml(): string {
    return this.children.map((block) => block.toHtml()).join('');
  }

  /**
   * 在 document 里面找到设计到 range 范围的 block
   * @param index range 的开始位置
   * @param length range 的长度
   */
  private findBlocksByRange(index: number, length: number): Block[] {
    const res: Block[] = [];
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
        res.push(element);
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
    return res;
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
   * @param op 结构化的 delta 数据
   */
  private getBlockTypeFromOp(op: Op): EnumBlockType | null {
    let thisBlockType = null;
    const data = op.insert;
    if (data === '\n') {
      if (op.attributes && op.attributes.blockquote) {
        thisBlockType = EnumBlockType.QuoteBlock;
      } else if (op.attributes && op.attributes['code-block']) {
        thisBlockType = EnumBlockType.CodeBlock;
      } else if (op.attributes && (op.attributes['list-id'] || op.attributes['bullet-id'])) {
        thisBlockType = EnumBlockType.ListItem;
      } else {
        thisBlockType = EnumBlockType.Paragraph;
      }
    } else if (typeof data === 'object') {
      if (data.hasOwnProperty('location')) {
        thisBlockType = EnumBlockType.Location;
      } else if (data.hasOwnProperty('attachment')) {
        thisBlockType = EnumBlockType.Attachment;
      } else if (data.hasOwnProperty('divide')) {
        thisBlockType = EnumBlockType.Divide;
      } else if (data.hasOwnProperty('rows') && data.hasOwnProperty('cols')) {
        thisBlockType = EnumBlockType.Table;
      }
    }

    return thisBlockType;
  }

  /**
   * 根据 change 信息生成 fragment
   */
  private getFragmentFromOp(op: Op): Fragment {
    const data = op.insert as any;
    const attributes = op.attributes as any;
    // 如果 data 是字符串说明是文字性内容
    if (typeof data === 'string') {
      if (data !== '\n') {
        // 如果不是换行符说明是普通内容
        return new FragmentText(op, attributes, data);
      } else {
        return new FragmentParaEnd(op);
      }
    } else if (typeof data === 'object') {
      if (data['gallery-block'] !== undefined || data.gallery !== undefined) {
        // 如果 gallery-block 存在说明是图片
        return new FragmentImage(op, attributes, data.gallery || data['gallery-block']);
      } else if (data['date-mention'] !== undefined) {
        // 如果 date-mention 存在说明是日期
        return new FragmentDate(op, attributes, data['date-mention']);
      } else if (data['inline-break'] === true) {
        // 如果是 list item 里的换行
        return new FragmentParaEnd(op);
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
