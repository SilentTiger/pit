import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import ICanvasContext from '../Common/ICanvasContext';
import IDocumentPos from '../Common/IDocumentPos';
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
import List from './List';
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
  List = 'List',
  Location = 'Location',
  Attachment = 'Attachment',
  Table = 'Table',
}
export default class Document extends LinkedList<Block> {
  public em: EventEmitter = new EventEmitter();
  public width: number = 0;
  public height: number = 0;
  public length: number = 0;
  private idleLayoutQueue: Block[] = [];
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private cursorPos: IDocumentPos | null = null;

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
      const { type, frames } = cache[i];
      const { frames: preBat } = cache[i - 1];
      if (type === cache[i - 1].type) {
        if (
          type === EnumBlockType.QuoteBlock ||
          type === EnumBlockType.CodeBlock ||
          (
            type === EnumBlockType.List &&
            (
              frames[0].slice(-1)[0].attributes["list-id"] ===
                preBat[0].slice(-1)[0].attributes["list-id"] &&
              frames[0].slice(-1)[0].attributes["bullet-id"] ===
                preBat[0].slice(-1)[0].attributes["bullet-id"]
            )
          )
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
          this.add(new Divide());
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
        case EnumBlockType.List:
          const listAttributes = currentBat.frames.slice(-1)[0].slice(-1)[0].attributes;
          const listItems = currentBat.frames.map((bat) => {
            const listItemAttributes = bat.pop().attributes;
            const frameBat = splitIntoBat(bat, (cur: any) => {
              return typeof cur.data === 'object' && cur.data['inline-break'] === true;
            });
            const frames = frameBat.map((b) => {
              const frags = b.map((change: any) => this.getFragmentFromChange(change));
              frags.push(new FragmentParaEnd());
              return new LayoutFrame(frags, {}, 616);
            });
            return new ListItem(frames, listItemAttributes, editorConfig.canvasWidth);
          });
          this.add(new List(listItems, listAttributes));
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

    this.head.setStart(0, true);
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

    // 绘制光标
    if (this.cursorPos !== null) {
      ctx.drawCursor(this.cursorPos.PosX, this.cursorPos.PosYText - scrollTop, this.cursorPos.textHeight, this.cursorPos.color);
    }
    ctx.restore();
  }

  public getLength(): number {
    return this.children.reduce((sum, currPara: Paragraph) => {
      return sum + currPara.length;
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

  public getDocumentPos = (x: number, y: number) => {
    const targetChild = this.findChildrenInPos(x, y);
    if (targetChild === null) { return null; }
    const docPos = targetChild.getDocumentPos(x, y);
    docPos.index += targetChild.start;
    docPos.PosX = Math.round(docPos.PosX + targetChild.x);
    docPos.PosYLine = Math.round(docPos.PosYLine + targetChild.y);
    docPos.PosYText = Math.round(docPos.PosYText + targetChild.y);

    this.cursorPos = docPos;
    return docPos;
  }

  private findChildrenInPos(x: number, y: number): Block {
    let current = this.startDrawingBlock;
    while (current !== null) {
      if (
        current.x <= x && x <= current.x + current.width &&
        current.y <= y && y <= current.y + current.height
        ) {
          break;
        }
      current = current.nextSibling === this.endDrawingBlock ? null : current.nextSibling;
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
        thisBlockType = EnumBlockType.List;
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
        return new FragmentImage(structData.data.gallery || structData.data['gallery-block'], structData.attributes);
      } else if (structData.data['date-mention'] !== undefined) {
        // 如果 date-mention 存在说明是日期
        return new FragmentDate(structData.attributes, structData.data['date-mention']);
      } else if (structData.data['inline-break'] === true) {
        // 如果是 list item 里的换行
        return new FragmentParaEnd();
      }
    }
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
      let currentBlock = this.idleLayoutQueue.shift();
      while (deadline.timeRemaining() > 3 && currentBlock) {
        if (currentBlock.needLayout) {
          currentBlock.layout();
          currentBlock = currentBlock.nextSibling;
        } else {
          currentBlock = null;
          break;
        }
      }

      if (currentBlock !== null) {
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
