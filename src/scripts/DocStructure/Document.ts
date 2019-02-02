import {LinkedList} from '../Common/LinkedList';
import FragmentDate from './FragmentDate';
import FragmentImage from './FragmentImage';
import FragmentText from './FragmentText';
import { FragmentTextDefaultAttributes } from './FragmentTextAttributes';
import Paragraph from './Paragraph';

export default class Document extends LinkedList<Paragraph> {
  constructor() {
    super();
    this.add(new Paragraph());
  }

  public readFromChanges = (changes: any[]) => {
    this.clear();
    let currentParagraph: Paragraph = this.tail;
    for (let i = 0, l = changes.length; i < l; i++) {
      const structData: any = changes[i];
      // 如果 data 是字符串说明是文字性内容
      if (typeof structData.data === 'string') {
        if (structData.data !== '\n') {
          // 如果不是换行符说明是普通内容
          const textFrag = new FragmentText(structData.attributes, structData.data);
          currentParagraph.add(textFrag);
        } else {
          // 是换行符就结束当前段落开启新段落
          if (currentParagraph.children.length === 0) {
            const textFrag = new FragmentText(FragmentTextDefaultAttributes, '');
            currentParagraph.add(textFrag);
          }
          currentParagraph.setAttributes(structData.attributes);
          currentParagraph = new Paragraph();
          this.add(currentParagraph);
        }
      } else if (typeof structData.data === 'object') {
        if (structData.data['gallery-block'] !== undefined || structData.data.gallery !== undefined) {
          // 如果 gallery-block 存在说明是图片
          const imageFrag =
            new FragmentImage(structData.data.gallery || structData.data['gallery-block'], structData.attributes);
          currentParagraph.add(imageFrag);
        } else if (structData.data['date-mention'] !== undefined) {
          // 如果 date-mention 存在说明是日期
          const dateFrag = new FragmentDate(structData.attributes, structData.data['date-mention']);
          currentParagraph.add(dateFrag);
        }
      }
    }
  }

  public clear() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].removeAll();
    }
    this.removeAll();
    this.add(new Paragraph());
  }

  public getLength(): number {
    return this.children.reduce((sum, currPara: Paragraph) => {
      return sum + currPara.length;
    }, 0);
  }
}
