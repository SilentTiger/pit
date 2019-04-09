import LineBreaker from '../../assets/linebreaker/linebreaker';
import { EventName } from '../Common/EnumEventName';
import { IDrawable } from "../Common/IDrawable";
import IRectangle from "../Common/IRectangle";
import LayoutPiece from "../Common/LayoutPiece";
import { LinkedList } from "../Common/LinkedList";
import { measureTextWidth } from "../Common/Platform";
import { guid } from "../Common/util";
import Line from "../RenderStructure/Line";
import Run from '../RenderStructure/Run';
import { createRun } from "../RenderStructure/runFactory";
import RunText from "../RenderStructure/RunText";
import { EnumAlign, EnumLineSpacing } from './EnumParagraphStyle';
import Fragment from "./Fragment";
import FragmentText from "./FragmentText";
import ILayoutFrameAttributes, { LayoutFrameDefaultAttributes } from "./ParagraphAttributes";

export default class LayoutFrame extends LinkedList<Fragment> implements IRectangle, IDrawable {
  public start: number = 0;
  public length: number = 0;
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public maxWidth: number = 0;
  public firstIndent: number = 0; // 首行缩进值，单位 px
  public attributes: ILayoutFrameAttributes = { ...LayoutFrameDefaultAttributes };
  public lines: Line[] = [];

  public readonly id: string = guid();

  private minBaseline: number = 0;
  private minLineHeight: number = 0;

  constructor(frags: Fragment[], attrs: any, maxWidth: number) {
    super();
    this.maxWidth = maxWidth;
    this.setAttributes(attrs);

    this.addAll(frags);
    for (let index = 0; index < frags.length; index++) {
      this.length += frags[index].length;
    }
  }

  public addLine(line: Line) {
    this.lines.push(line);
    line.em.on(EventName.LINE_CHANGE_SIZE, this.childrenSizeChangeHandler);

    const newWidth = Math.max(this.width, line.x + line.width);
    const newHeight = this.height + line.height;
    this.setSize(newHeight, newWidth);
  }

  public tailLine(): Line | null {
    return this.lines.length === 0 ? null :
      this.lines[this.lines.length - 1];
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
    for (let i = 0, l = this.children.length; i < l; i++) {
      const currentFrag = this.children[i];
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

  public draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) {
    for (let i = 0, l = this.lines.length; i < l; i++) {
      this.lines[i].draw(ctx, this.x + x, this.y + y);
    }
    if ((window as any).frameBorder) {
      ctx.save();
      ctx.strokeStyle = 'blue';
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height);
      ctx.restore();
    }
  }

  public setAttributes(attr: any) {
    const keys = Object.keys(this.attributes);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if (attr[key] !== undefined) {
        (this.attributes as any)[key] = attr[key];
      }
    }
    if (attr.linespacing !== undefined) {
      const ls =  EnumLineSpacing.get(attr.linespacing);
      if (!isNaN(ls)) {
        this.attributes.linespacing = ls;
      }
    }
  }

  public layout() {
    this.addLine(
      new Line(
        this.firstIndent, 0, this.attributes.linespacing,
        this.maxWidth - this.firstIndent,
        this.minBaseline, this.minLineHeight,
      ),
    );
    this.breakLines(this.calLineBreakPoint());
    // 如果当前段落是空的，要加一个空 run text
    if (this.tailLine().children.length === 0) {
      this.tailLine().add(new RunText(this.children[0] as FragmentText, 0, 0, ''));
    }
    this.setIndex();
    for (let i = 0, l = this.lines.length; i < l; i++) {
      let align: EnumAlign;
      if (this.attributes.align === EnumAlign.justify && i === l - 1) {
        align = EnumAlign.left;
      } else if (this.attributes.align === EnumAlign.scattered) {
        align = EnumAlign.justify;
      } else {
        align = this.attributes.align;
      }
      this.lines[i].layout(align);
    }
  }

  public setMaxWidth(width: number) {
    this.maxWidth = width;
  }

  public setFirstIndent(firstIndent: number) {
    this.firstIndent = firstIndent;
  }

  public setMinMetrics(metrics: {baseline: number, bottom: number}) {
    this.minBaseline = metrics.baseline;
    this.minLineHeight = metrics.bottom;
  }

  public getDocumentPos(x: number, y: number): number {
    let line: Line = null;
    let lineIndex = 0;
    let findLine = false;

    for (const l = this.lines.length; lineIndex < l; lineIndex++) {
      line = this.lines[lineIndex];
      if (
        (line.y <= y && y <= line.y + line.height) ||
        (y < line.y && lineIndex === 0) ||
        (y > line.y + line.height && lineIndex === this.lines.length - 1)
      ) {
        findLine = true;
        lineIndex++;
        break;
      }
    }
    lineIndex--;
    if (!findLine) { return null; }

    let run: Run = null;
    let runIndex = 0;
    let findRun = false;
    let runStart = 0;

    // 如果 y 坐标比行 y 坐标还小把 x 坐标改成 -1 来选中这一行的最前面一个位置
    // 如果 y 坐标比行 y + 高度 坐标还大把 x 坐标改成 行宽 + 1 来选中这一行的最后面一个位置
    if (y < line.y) {
      x = -1;
    } else if (y > line.y + line.height) {
      x = line.width + 1;
    }

    if (x <= line.x) {
      run = line.head;
      findRun = true;
    } else if (x >= line.x + line.width) {
      run = line.tail;
      runIndex = line.children.length - 1;
      findRun = true;
      runStart = line.length - run.length;
    } else {
      x = x - line.x;
      for (const l = line.children.length; runIndex < l; runIndex++) {
        run = line.children[runIndex];
        if (run.x <= x && x <= run.x + run.width) {
          findRun = true;
          break;
        }
        runStart += run.length;
      }
    }

    if (!findRun) { return null; }

    let posData = run.getDocumentPos(x - run.x, y - line.y - run.y, false);
    if (posData === null) {
      if (runIndex === 0) {
        posData = run.getDocumentPos(x - run.x, y - line.y - run.y, true);
      } else {
        run = run.prevSibling;
        runStart -= run.length;
        posData = run.getDocumentPos(run.width, y - line.y - run.y, false);
      }
    }
    posData += line.start + runStart;
    return posData;
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    const rects: IRectangle[] = [];
    for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
      const line = this.lines[lineIndex];
      if (line.start + line.length <= index) { continue; }
      if (line.start >= index + length) { break; }

      const lineStart = Math.max(0, index - line.start);
      const lineLength = Math.min(length, index + length - line.start);

      let runStart = 0;

      let startX;
      let endX;
      for (let runIndex = 0; runIndex < line.children.length; runIndex++) {
        const run = line.children[runIndex];
        if (lineStart >= runStart && lineStart < runStart + run.length) {
          // 找到了起始位置
          startX = run.getCoordinatePosX(lineStart - runStart) + run.x + line.x;
        }

        if (runStart + run.length === lineLength + lineStart) {
          endX = run.x + run.width + line.x;
        } else if (lineLength + lineStart < runStart + run.length) {
          // 找到了结束位置
          endX = run.getCoordinatePosX(lineLength + lineStart - runStart) + run.x + line.x;
          break;
        }
        endX = endX ? endX : line.width + line.x;
        runStart += run.length;
      }

      rects.push({
        x: startX,
        y: line.y,
        width: endX - startX,
        height: line.height,
      });
    }
    for (let rectIndex = 0; rectIndex < rects.length; rectIndex++) {
      const rect = rects[rectIndex];
      rect.x += this.x;
      rect.y += this.y;
    }
    return rects;
  }

  private constructLayoutPieces(frags: FragmentText[]): LayoutPiece[] {
    if (frags.length === 0) {
      return [];
    }
    const res: LayoutPiece[] = [];
    const totalString = frags.map((frag) => frag.content).join('');
    const breaker = new LineBreaker(totalString);

    let breakStart = frags[0].start;
    let bk = breaker.nextBreak();
    let last = 0;
    while (bk) {
      const word = totalString.slice(last, bk.position);
      last = bk.position;
      bk = breaker.nextBreak();

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
      breakStart += finalWord.length;

      if (spaceCount > 0) {
        breakStart += spaceCount;
        const piece = new LayoutPiece();
        piece.isHolder = false;
        piece.isSpace = true;
        piece.text = '';
        while (spaceCount > 0) {
          piece.text += ' ';
          spaceCount--;
        }
        piece.frags = this.getFragsForLayoutPiece(frags, piece, breakStart);
        piece.calTotalWidth();
        res.push(piece);
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

    for (let i = 0, l = frags.length; i < l; i++) {
      const frag = frags[i];
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
    }
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
      const freeSpace = this.maxWidth - this.tailLine().x - this.tailLine().width;
      const currentPiece = pieces[i];
      if (currentPiece.totalWidth <= freeSpace ) {
        if (currentPiece.isHolder) {
          const run = createRun(currentPiece.frags[0].frag, 0, 0);
          const size = run.calSize();
          run.setSize(size.height, size.width);
          this.tailLine().add(run);
        } else {
          if (currentPiece.frags.length === 1) {
            const run = new RunText(currentPiece.frags[0].frag as FragmentText, 0, 0, currentPiece.text);
            run.setSize(run.calHeight(), currentPiece.totalWidth);
            run.isSpace = currentPiece.isSpace;
            this.tailLine().add(run);
          } else {
            for (let index = 0, fl = currentPiece.frags.length; index < fl; index++) {
              const frag = currentPiece.frags[index];
              const run = new RunText(frag.frag as FragmentText, 0, 0,
                  currentPiece.text.substring(frag.start, frag.end));
              run.setSize(run.calHeight(), currentPiece.fragWidth[index]);
              run.isSpace = currentPiece.isSpace;
              this.tailLine().add(run);
            }
          }
        }
      } else {
        // 如果不能把整个 piece 放入 tail line， 就看是否需要创建新行再尝试拆分这个 piece
        if (this.tailLine().children.length > 0) {
          this.addLine(
            new Line(
              0, Math.floor(this.tailLine().y + this.tailLine().height),
              this.attributes.linespacing, this.maxWidth,
              this.minBaseline, this.minLineHeight,
            ),
          );
          i--;
          continue;
        } else {
          // 如果是空行就看这个 piece 是不是 holder，是 holder 直接插入，加新行，进入下一个循环
          if (currentPiece.isHolder) {
            const run = createRun(currentPiece.frags[0].frag, 0, 0);
            const size = run.calSize();
            run.setSize(size.height, size.width);
            this.tailLine().add(run);
            this.addLine(
              new Line(
                0, Math.floor(this.tailLine().y + this.tailLine().height),
                this.attributes.linespacing, this.maxWidth,
                this.minBaseline, this.minLineHeight,
                ),
            );
            continue;
          }
        }
        // 这里用一个嵌套循环来尝试拆分 piece，外层循环拆 piece 中的 frag，内层循环拆某个 frag 中的字符
        let fragIndex = 0;
        while (fragIndex < currentPiece.frags.length) {
          let lineFreeSpace = this.maxWidth - this.tailLine().x - this.tailLine().width;
          const currentFrag = currentPiece.frags[fragIndex];
          if (currentPiece.fragWidth[fragIndex] <= lineFreeSpace) {
            // 如果拆分 frag 后 frag 可以插入就插入并进入下一个循环
            const run = new RunText(currentFrag.frag as FragmentText, 0, 0,
              currentPiece.text.substring(currentFrag.start, currentFrag.end));
            run.setSize(run.calHeight(), currentPiece.fragWidth[fragIndex]);
            run.isSpace = currentPiece.isSpace;
            this.tailLine().add(run);
            lineFreeSpace -= currentPiece.fragWidth[fragIndex];
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
                  this.tailLine().add(run);
                  lineFreeSpace -= charPieceWidth;
                  charStartIndex += length;
                  // 如果这个 frag 已经处理完了，就 break 进去下一个 frag 的循环
                  // 如果这个 frag 还没处理完，就创建新 line 继续处理这个 frag 剩下的内容
                  break;
                } else {
                  if (length === 1) {
                    // 如果当前只有一个字符，就看是不是空行，是空行就强行插入这个字符，否则创建新行重新跑循环
                    if (this.tailLine().children.length === 0) {
                      const run = new RunText(currentFrag.frag as FragmentText, 0, 0, text);
                      run.setSize(run.calHeight(), charPieceWidth);
                      run.isSpace = currentPiece.isSpace;
                      this.tailLine().add(run);
                      charStartIndex += 1;
                    } else {
                      this.addLine(
                        new Line(
                          0, Math.floor(this.tailLine().y + this.tailLine().height),
                          this.attributes.linespacing, this.maxWidth,
                          this.minBaseline, this.minLineHeight,
                        ),
                      );
                      // 这里要重新计算 length 和 lineFreeSpace
                      length = currentFrag.end - charStartIndex + 2;
                      lineFreeSpace = this.maxWidth - this.tailLine().x - this.tailLine().width;
                      break;
                    }
                  }
                }
              }

            }
          }
          fragIndex++;
        }
      }
    }
  }

  private setSize(height: number, width: number) {
    this.width = width;
    this.height = height;
  }

  private childrenSizeChangeHandler = () => {
    const size = this.calSize();
    this.setSize(size.height, size.width);
  }

  private calSize() {
    let newWidth = 0;
    let newHeight = 0;
    this.lines.forEach((item) => {
      newWidth = Math.max(newWidth, item.x + item.width);
    });
    const lastLine = this.lines[this.lines.length - 1];
    newHeight = lastLine.y + lastLine.height;
    return {
      width: newWidth,
      height: newHeight,
    };
  }

  private setIndex() {
    for (let index = 0; index < this.lines.length; index++) {
      const element = this.lines[index];
      if (index === 0) {
        element.start = 0;
      } else {
        element.start = this.lines[index - 1].start + this.lines[index - 1].length;
      }
    }
  }

}
