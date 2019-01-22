import { LineBreaker } from 'css-line-break';
import * as EventEmitter from 'eventemitter3';
import { IDrawable } from '../Common/IDrawable';
import IRectangle from '../Common/IRectangle';
import LayoutPiece from '../Common/LayoutPiece';
import { ILinkedListNode, LinkedList } from "../Common/LinkedList";
import { maxWidth, measureTextWidth } from '../Common/Platform';
import { guid } from '../Common/util';
import FragmentText from '../DocStructure/FragmentText';
import Paragraph from '../DocStructure/Paragraph';
import { EventName } from './EnumEventName';
import Line from "./Line";
import Root from "./Root";
import { createRun } from './runFactory';
import RunText from './RunText';

export default class Frame extends LinkedList<Line> implements ILinkedListNode, IRectangle, IDrawable {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public prevSibling: Frame = null;
  public nextSibling: Frame = null;
  public parent: Root;
  public paragraph: Paragraph;
  public readonly id: string = guid();
  public em = new EventEmitter();

  constructor(data: Paragraph, x: number, y: number) {
    super();
    if (x !== undefined) {
      this.x = x;
    }
    if (y !== undefined) {
      this.y = y;
    }

    this.paragraph = data;
    this.add(new Line(this.x, this.y));
    this.breakLines(this.calLineBreakPoint());
    // 如果当前段落是空的，要加一个空 run text
    if (this.tail.children.length === 0) {
      this.tail.add(new RunText(this.paragraph.children[0] as FragmentText, 0, 0, ''));
    }
    this.children.forEach((l) => {
      l.layout();
    });
    // this.setSize();
  }

  public add(line: Line) {
    super.add(line);
    line.em.on(EventName.CHANGE_SIZE, this.childrenSizeChangeHandler);
    this.setSize();
  }

  public calLineBreakPoint = (): LayoutPiece[] => {
    let res: LayoutPiece[] = [];
    // 已经获得了段落的所有数据，准备开始排版
    // 从 0 开始遍历 所有 fragment，如果是 fragment text 就拿到文字内容，直到遇到非 fragment text
    // 这里非 fragment text 的 fragment 应该肯定是会分配一个单独的 run 的
    // 则前面的一系列 fragment text 拿到所以文字内容一起进行 line break
    // 遍历所有的 break
    // 先找出这个 break 是属于哪个 fragment text 的
    // 如果某个 break 完整的包含于某个 fragment text 中，则直接度量这个 break 的长度并尝试插入当前的 line
    // 如果某个 break 不是完整包含于某个 fragment text 说明这个， break 是跨 fragment text 的
    // 则遍历这个 break 中的每个字符判断其属于哪个 fragment text，并将属同一个 fragment text 的字符放置于一个 run 中，并度量其长度
    // 将这个 break 的所有 run 的长度求和后看能不能插入当前 line
    const currentFragmentText: FragmentText[] = [];
    for (let i = 0, l = this.paragraph.children.length; i < l; i++) {
      const currentFrag = this.paragraph.children[i];
      if (currentFrag instanceof FragmentText) {
        currentFragmentText.push(currentFrag);
      } else {
        // 说明上一批 fragment text 已经确定，开始处理
        res = res.concat(this.constructLayoutPieces(currentFragmentText));
        // 已经处理完 currentFragmentText，清空 currentFragmentText
        currentFragmentText.length = 0;
        // 如果不是 fragment text，则作为单独的 run 插入当前 line
        const piece = new LayoutPiece();
        piece.frags = [{frag: currentFrag}];
        piece.isHolder = true;
        piece.calTotalWidth();
        res.push(piece);
      }
    }
    if (currentFragmentText.length > 0) {
      res = res.concat(this.constructLayoutPieces(currentFragmentText));
    }

    return res;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.children.forEach((line) => {
      line.draw(ctx);
    });
  }

  private constructLayoutPieces(frags: FragmentText[]): LayoutPiece[] {
    if (frags.length === 0) {
      return [];
    }
    const res: LayoutPiece[] = [];
    const breaker = LineBreaker(frags.map((frag) => frag.content).join(''), {
      lineBreak: 'normal',
      wordBreak: 'normal',
    });

    let bk;
    let breakStart = frags[0].start;
    while (!(bk = breaker.next()).done) {
      const word: string = bk.value.slice();
      const finalWord = word.trim();
      let spaceCount = word.length - finalWord.length;

      if (finalWord.length > 0) {

        const piece = new LayoutPiece();
        piece.isHolder = false;
        piece.isSpace = false;
        piece.text = finalWord;

        const layoutPieceFrags = this.getFragsForLayoutPiece(frags, piece, breakStart);
        piece.frags = layoutPieceFrags;
        piece.calTotalWidth();
        res.push(piece);
      }
      breakStart += word.length;

      while (spaceCount > 0) {
        const piece = new LayoutPiece();
        piece.isHolder = false;
        piece.isSpace = true;
        piece.text = ' ';
        piece.frags = this.getFragsForLayoutPiece(frags, piece, breakStart);

        breakStart++;
        spaceCount--;
      }
    }

    return res;
  }

  private getFragsForLayoutPiece(frags: FragmentText[], piece: LayoutPiece, start: number) {
    const res: Array<{
      start: number,
      end: number,
      frag: FragmentText,
    }> = [];

    frags.forEach((frag) => {
      if (
        !((frag.start + frag.length - 1 < start) ||
        (frag.start >= start + piece.text.length))
      ) {
        res.push({
          start: Math.max(start, frag.start) - start,
          end: Math.min(start + piece.text.length, frag.start + frag.length) - start,
          frag,
        });
      }
    });
    return res;
  }

  private breakLines(pieces: LayoutPiece[]) {
    /**
     * 遍历所有的 piece
     * 如果当前 piece 能放入 tail line，就插入此行，这里还要看这个 piece 是几个 fragment
     * 否则新建行再看能否插入
     * 如能则进入下一个循环
     * 如不能，则看能否拆分当前 piece，
     * 不能则强行插入此行并创建新行，然后进入下一个循环
     * 能拆分，则依次计算 piece 中所有字符宽度
     * 然后为每一行尽可能放入更多内容
     */

    for (let i = 0, l = pieces.length; i < l; i++) {
      const freeSpace = maxWidth - this.tail.x - this.tail.width;
      const currentPiece = pieces[i];
      if (currentPiece.totalWidth <= freeSpace ) {
        if (currentPiece.isHolder) {
          const run = createRun(currentPiece.frags[0].frag, 0, 0);
          const size = run.calSize();
          run.setSize(size.height, size.width);
          this.tail.add(run);
        } else {
          if (currentPiece.frags.length === 1) {
            const run = new RunText(currentPiece.frags[0].frag as FragmentText, 0, 0, currentPiece.text);
            run.setSize(run.calHeight(), currentPiece.totalWidth);
            run.isSpace = currentPiece.isSpace;
            this.tail.add(run);
          } else {
            currentPiece.frags.forEach((frag, index) => {
              const run = new RunText(frag.frag as FragmentText, 0, 0,
                  currentPiece.text.substring(frag.start, frag.end));
              run.setSize(run.calHeight(), currentPiece.fragWidth[index]);
              run.isSpace = currentPiece.isSpace;
              this.tail.add(run);
            });
          }
        }
      } else {
        // 如果不能把整个 piece 放入 tail line， 就看是否需要创建新行再尝试拆分这个 piece
        if (this.tail.children.length > 0) {
          this.add(new Line(this.x, this.tail.y + this.tail.height));
          i--;
          continue;
        } else {
          // 如果是空行就看这个 piece 是不是 holder，是 holder 直接插入，加新行，进入下一个循环
          if (currentPiece.isHolder) {
            const run = createRun(currentPiece.frags[0].frag, 0, 0);
            const size = run.calSize();
            run.setSize(size.height, size.width);
            this.tail.add(run);
          }
        }
        // 这里用一个嵌套循环来尝试拆分 piece，外层循环 piece 中的 frag，内层循环某个 frag 中的字符
        let fragIndex = 0;
        while (fragIndex < currentPiece.frags.length) {
          let lineFreeSpace = maxWidth - this.tail.x - this.tail.width;
          const currentFrag = currentPiece.frags[fragIndex];
          if (currentPiece.fragWidth[fragIndex] <= lineFreeSpace) {
            // 如果拆分 frag 后 frag 可以插入就插入并进入下一个循环
            const run = new RunText(currentFrag.frag as FragmentText, 0, 0,
              currentPiece.text.substring(currentFrag.start, currentFrag.end));
            run.setSize(run.calHeight(), currentPiece.fragWidth[fragIndex]);
            run.isSpace = currentPiece.isSpace;
            this.tail.add(run);
            lineFreeSpace -= currentPiece.fragWidth[fragIndex];
            fragIndex++;
            continue;
          } else {
            // 如果拆分后 frag 不能插入，就再拆分这个 frag 到字符，再尝试插入
            let charStartIndex = currentFrag.start;

            while (charStartIndex <= currentFrag.end) {

              for (let length = currentFrag.end - charStartIndex + 1; length >= 0; length--) {
                const text = currentPiece.text.substr(currentFrag.start + charStartIndex, length);
                const charPieceWidth = measureTextWidth(
                  text, (currentFrag.frag as FragmentText).attributes,
                );
                if (charPieceWidth <= lineFreeSpace) {
                  // 如果空间足够就插入
                  const run = new RunText(currentFrag.frag as FragmentText, 0, 0, text);
                  run.setSize(run.calHeight(), charPieceWidth);
                  run.isSpace = currentPiece.isSpace;
                  this.tail.add(run);
                  lineFreeSpace -= charPieceWidth;
                  charStartIndex += length;
                  // 如果这个 frag 已经处理完了，就 break 进去下一个 frag 的循环
                  // 如果这个 frag 还没处理完，就创建新 line 继续处理这个 frag 剩下的内容
                } else {
                  if (length === 1) {
                    // 如果当前只有一个字符，就看是不是空行，是空行就强行插入这个字符，否则创建新行重新跑循环
                    if (this.tail.children.length === 0) {
                      const run = new RunText(currentFrag.frag as FragmentText, 0, 0, text);
                      run.setSize(run.calHeight(), charPieceWidth);
                      run.isSpace = currentPiece.isSpace;
                      this.tail.add(run);
                      charStartIndex += 1;
                    } else {
                      this.add(new Line(this.x, this.tail.y + this.tail.height));
                      break;
                    }
                  }
                }
              }

            }
          }
        }
      }
    }
  }

  private childrenSizeChangeHandler = () => {
    this.setSize();
  }

  private setSize() {
    let newWidth = 0;
    let newHeight = 0;
    this.children.forEach((item) => {
      newHeight += item.height;
      newWidth = Math.max(newWidth, item.width);
    });
    this.width = newWidth;
    this.height = newHeight;
    this.em.emit(EventName.CHANGE_SIZE, { width: this.width, height: this.height });
  }
}
