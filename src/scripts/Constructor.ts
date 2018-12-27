
import { FragmentDefaultAttributes } from './DocStructure/FragmentAttributes';
import FragmentImage from './DocStructure/FragmentImage';
import { FragmentImageDefaultAttributes } from './DocStructure/FragmentImageAttributes';
import FragmentText from './DocStructure/FragmentText';
import { FragmentTextDefaultAttributes } from './DocStructure/FragmentTextAttributes';
import Paragraph from './DocStructure/Paragraph';
import { MessageEnum } from './MessageEnum';
import WorkerAdaptor from './WorkerAdaptor';

const adaptor = new WorkerAdaptor(self as DedicatedWorkerGlobalScope);

class DocumentConstructor {

  private documentData: any[] = [];
  private currentParagraph: Paragraph;

  public startConstruct = () => {
    this.documentData.length = 0;
    this.currentParagraph = new Paragraph();
  }

  public endConstruct = () => {
    adaptor.send(MessageEnum.ConstructorEnd, this.documentData);
    this.documentData.length = 0;
  }

  public appendConstruct = (data: any) => {
    this.parseData(data);
  }

  private parseData = (data: any) => {
    const structData = JSON.parse(data.data);

    // 如果 data 是字符串说明是文字性内容
    if (typeof structData.data === 'string') {
      if (structData.data !== '\\n') {
        // 如果不是换行符说明是普通内容
        const textFrag = new FragmentText();
        this.currentParagraph.children.push(textFrag);
        textFrag.attributes = { ...FragmentDefaultAttributes, ...FragmentTextDefaultAttributes };
        Object.keys(textFrag.attributes).forEach((key) => {
          if (structData.attributes[key] !== undefined) {
            (textFrag.attributes as any)[key] = structData.attributes[key];
          }
        });
      } else {
        // 是换行符就结束当前段落开启新段落
        this.documentData.push(this.currentParagraph);
        this.currentParagraph = new Paragraph();
      }
    } else if (typeof structData.data === 'object') {
      if (structData.data['gallery-block'] !== undefined) {
        // 如果 gallery-block 存在说明是图片
        const imageFrag = new FragmentImage();
        this.currentParagraph.children.push(imageFrag);
        imageFrag.attributes = { ...FragmentDefaultAttributes, ...FragmentImageDefaultAttributes };
        Object.keys(imageFrag.attributes).forEach((key) => {
          if (structData.attributes[key] !== undefined) {
            (imageFrag.attributes as any)[key] = structData.attributes[key];
          }
        });
        imageFrag.attributes.src = structData.data['gallery-block'];
      }
    }
  }
}

const documentConstructor = new DocumentConstructor();

adaptor.on(MessageEnum.startConstruct, documentConstructor.startConstruct);
adaptor.on(MessageEnum.appendConstruct, documentConstructor.appendConstruct);
adaptor.on(MessageEnum.endConstruct, documentConstructor.endConstruct);
