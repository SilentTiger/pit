import {LinkedList} from '../Common/LinkedList';
import FragmentDate from './FragmentDate';
import { FragmentDateDefaultAttributes } from './FragmentDateAttributes';
import FragmentImage from './FragmentImage';
import FragmentText from './FragmentText';
import { FragmentTextDefaultAttributes } from './FragmentTextAttributes';
import Paragraph from './Paragraph';

export default class Document extends LinkedList<Paragraph> {
  private currentParagraph: Paragraph = new Paragraph();
  constructor() {
    super();
  }

  public appendDelta = (structData: any) => {
    // 如果 data 是字符串说明是文字性内容
    if (typeof structData.data === 'string') {
      if (structData.data !== '\n') {
        // 如果不是换行符说明是普通内容
        const textFrag = new FragmentText(structData.attributes, structData.data);
        this.currentParagraph.add(textFrag);
      } else {
        // 是换行符就结束当前段落开启新段落
        if (this.currentParagraph.children.length === 0) {
          const textFrag = new FragmentText(FragmentTextDefaultAttributes, '');
          this.currentParagraph.add(textFrag);
        }
        this.currentParagraph.setAttributes(structData.attributes);
        this.add(this.currentParagraph);
        this.currentParagraph = new Paragraph();
      }
    } else if (typeof structData.data === 'object') {
      if (structData.data['gallery-block'] !== undefined || structData.data.gallery !== undefined) {
        // 如果 gallery-block 存在说明是图片
        const imageFrag =
          new FragmentImage(structData.data.gallery || structData.data['gallery-block'], structData.attributes);
        this.currentParagraph.add(imageFrag);
      } else if (structData.data['date-mention'] !== undefined) {
        // 如果 date-mention 存在说明是日期
        const dateFrag = new FragmentDate(FragmentDateDefaultAttributes, structData.data['date-mention']);
        this.currentParagraph.add(dateFrag);
      }
    }
  }
}
