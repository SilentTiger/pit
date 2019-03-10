import * as EventEmitter from 'eventemitter3';
import { EventName } from '../Common/EnumEventName';
import {LinkedList} from '../Common/LinkedList';
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
              frames[0][frames[0].length - 1].attributes["list-id"] ===
                preBat[0][preBat[0].length - 1].attributes["list-id"] &&
              frames[0][frames[0].length - 1].attributes["bullet-id"] ===
                preBat[0][preBat[0].length - 1].attributes["bullet-id"]
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
            currentBat.frames[0][currentBat.frames[0].length - 1].attributes,
            616,
          );
          this.add(new Paragraph(frame, 616));
          break;
        case EnumBlockType.QuoteBlock:
          const quoteFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromChange(change)),
              bat[bat.length - 1].attributes, 616,
            );
          });
          this.add(new QuoteBlock(quoteFrames));
          break;
        case EnumBlockType.List:
          const listFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromChange(change)),
              bat[bat.length - 1].attributes, 616,
            );
          });
          this.add(new List(listFrames));
          break;
        case EnumBlockType.CodeBlock:
          const codeFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromChange(change)),
              bat[bat.length - 1].attributes, 616,
            );
          });
          this.add(new CodeBlock(codeFrames));
          break;
      }
    }

  }

  public clear() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].destroy();
    }
    this.removeAll();
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
      }
    }
  }
}
