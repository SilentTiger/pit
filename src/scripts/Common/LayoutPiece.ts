import Fragment from '../DocStructure/Fragment';
import FragmentText from '../DocStructure/FragmentText';
import { measureTextWidth } from './Platform';

export default class LayoutPiece {
  public frags: Array<{
    start: number;
    end: number;
    frag: Fragment;
  }> = [];
  public isSpace: boolean = false;
  public text: string = '';
  public totalWidth: number = 0;
  public fragWidth: number[] = [];
  public isHolder: boolean;

  constructor(isHolder: boolean) {
    this.isHolder = isHolder;
  }

  public calTotalWidth() {
    if (this.isHolder) {
      this.totalWidth = this.frags[0].frag.calSize().width;
      this.fragWidth = [this.totalWidth];
      return;
    }
    let width: number;
    if (this.frags.length === 1) {
      width = measureTextWidth(
        this.text,
        (this.frags[0].frag as FragmentText).attributes,
      );
      this.fragWidth = [width];
    } else {
      if (this.fragWidth === undefined || !this.fragWidth.length) {
        this.calFragWidth();
      }
      width = this.fragWidth.reduce((sum, cur) => {
        return sum + cur;
      }, 0);
    }
    this.totalWidth = width;
  }

  public calFragWidth() {
    if (this.frags.length === 1) {
      this.fragWidth = [this.totalWidth];
    } else {
      this.fragWidth = this.frags.map((frag) => {
        return measureTextWidth(
          this.text.substring(frag.start, frag.end),
          (frag.frag as FragmentText).attributes,
        );
      });
    }
  }

  public calCharWidthByFrag(fragIndex: number) {
    const frag = this.frags[fragIndex];
    return this.text
      .substr(frag.start, frag.end)
      .split("")
      .map((char) => {
        return measureTextWidth(char, (frag.frag as FragmentText).attributes);
      });
  }
}
