
import FragmentImage from './DocStructure/FragmentImage';
import FragmentText from './DocStructure/FragmentText';
import Paragraph from './DocStructure/Paragraph';

class DocumentConstructor {

  private documentData: any[] = [];
  private currentParagraph: Paragraph;

  public startConstruct = () => {
    this.documentData.length = 0;
    this.currentParagraph = new Paragraph();
    console.time('constructor');
  }

  public endConstruct = () => {
    console.timeEnd('constructor');
    return this.documentData;
  }

  public appendConstruct = (data: any) => {
    this.parseData(data);
  }

  private parseData = (structData: any) => {
    // 如果 data 是字符串说明是文字性内容
    if (typeof structData.data === 'string') {
      if (structData.data !== '\n') {
        // 如果不是换行符说明是普通内容
        const textFrag = new FragmentText(structData.attributes);
        textFrag.content = structData.data;
        this.currentParagraph.add(textFrag);
      } else {
        // 是换行符就结束当前段落开启新段落
        if (this.currentParagraph.children.length === 0) {
          const textFrag = new FragmentText();
          textFrag.content = '';
          this.currentParagraph.add(textFrag);
        }
        this.documentData.push(this.currentParagraph);
        this.currentParagraph = new Paragraph();
      }
    } else if (typeof structData.data === 'object') {
      if (structData.data['gallery-block'] !== undefined) {
        // 如果 gallery-block 存在说明是图片
        const imageFrag = new FragmentImage(structData.attributes);
        imageFrag.content = structData.data['gallery-block'];
        this.currentParagraph.add(imageFrag);
      }
    }
  }
}

const documentConstructor = new DocumentConstructor();

export default documentConstructor;
