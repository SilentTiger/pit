import IRectangle from '../Common/IRectangle';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { ctx, getTextMetrics, maxWidth } from '../Common/Platform';
import { guid } from "../Common/Util";
import Fragment from '../DocStructure/Fragment';
import FragmentImage from '../DocStructure/FragmentImage';
import FragmentText from '../DocStructure/FragmentText';
import Paragraph from '../DocStructure/Paragraph';
import Line from "./Line";
import Root from "./Root";
export default class Frame extends LinkedList<Line> implements ILinkedListNode, IRectangle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public prevSibling: Frame;
  public nextSibling: Frame;
  public parent: Root;
  public readonly id: string = guid();
  constructor(data: Paragraph, x: number, y: number) {
    super();
    if (x !== undefined) {
      this.x = x;
    }
    if (y !== undefined) {
      this.y = y;
    }
    this.add(new Line(this.x, this.y));
    const current = data.head;
    while (current) {
      this.addFragment(current);
    }
  }

  public addFragment = (fragment: Fragment) => {
    // 找到当前最后一个 line，判断这个 line 还能不能放下内容
    const lastLine = this.tail;
    const freeSpace = maxWidth - lastLine.x - lastLine.width;
    // 开始判断 freeSpace 能否放下当前这个 fragement 中第一个不可分割的内容
    let minSpaceRequirement = 0;
    if (fragment instanceof FragmentText) {
      minSpaceRequirement = fragment.content.length > 0 ?
      getTextMetrics(fragment.content[0], fragment.attributes).width : 0;
    }
  }

  private calFragmentWidth(frag: Fragment): number {
    let res = 0;
    switch (true) {
      case frag instanceof FragmentText:
        const textMetrics = ctx.measureText((frag as FragmentText).content);
        res = textMetrics.width;
        break;
      case frag instanceof FragmentImage:
        res = (frag as FragmentImage).attributes.oriWidth;
        break;
    }
    return res;
  }
}
