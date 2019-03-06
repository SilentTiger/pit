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

    const cache: Array<{ type: EnumBlockType, bat: any[] }> = [];
    let batCache = [];
    for (let i = 0, l = changes.length; i < l; i++) {
      const thisDataType = this.getBlockTypeFromChange(changes[i]);
      batCache.push(changes[i]);
      if (thisDataType !== null) {
        cache.push({
          type: thisDataType,
          bat: batCache,
        });
        batCache = [];
      }
    }

    for (let i = cache.length - 1; i > 0; i--) {
      const { type, bat } = cache[i];
      const { bat: preBat } = cache[i - 1];
      if (type === cache[i - 1].type) {
        if (
          type === EnumBlockType.QuoteBlock ||
          type === EnumBlockType.CodeBlock ||
          (
            type === EnumBlockType.List && (
              (bat[bat.length - 1].attributes['list-id'] === preBat[preBat.length - 1].attributes['list-id']) &&
              (bat[bat.length - 1].attributes['bullet-id'] === preBat[preBat.length - 1].attributes['bullet-id'])
            )
          )
        ) {
          cache[i - 1].bat = cache[i - 1].bat.concat(cache[i].bat);
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
          this.add(new Location(currentBat.bat[0].data.location));
          break;
        case EnumBlockType.Attachment:
          this.add(new Attachment(currentBat.bat[0].data.attachment, currentBat.bat[0].attributes));
          break;
        case EnumBlockType.Table:
          this.add(new Table());
          break;
        case EnumBlockType.Paragraph:
          this.add(new Paragraph(currentBat.bat.map((change) => this.getFragmentFromChange(change)),
            currentBat.bat[currentBat.bat.length - 1].attributes));
          break;
        case EnumBlockType.QuoteBlock:
          this.add(new QuoteBlock(currentBat.bat.map((change) => this.getFragmentFromChange(change))));
          break;
        case EnumBlockType.List:
          this.add(new List(currentBat.bat.map((change) => this.getFragmentFromChange(change))));
          break;
        case EnumBlockType.CodeBlock:
          this.add(new CodeBlock(currentBat.bat.map((change) => this.getFragmentFromChange(change))));
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
