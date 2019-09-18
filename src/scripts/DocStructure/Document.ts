import * as EventEmitter from 'eventemitter3';
import Delta from 'quill-delta';
import Op from 'quill-delta/dist/Op';
import { EventName } from '../Common/EnumEventName';
import ICanvasContext from '../Common/ICanvasContext';
import ICommand from '../Common/ICommand';
import IExportable from '../Common/IExportable';
import IRange from '../Common/IRange';
import IRectangle from '../Common/IRectangle';
import { LinkedList } from '../Common/LinkedList';
import { requestIdleCallback } from '../Common/Platform';
import { collectAttributes, EnumIntersectionType, findChildrenByRange, guid, hasIntersection, splitIntoBat } from '../Common/util';
import editorConfig from '../IEditorConfig';
import Block from './Block';
import { EnumListType } from './EnumListStyle';
import Fragment from './Fragment';
import FragmentDate from './FragmentDate';
import FragmentImage from './FragmentImage';
import { IFragmentOverwriteAttributes } from './FragmentOverwriteAttributes';
import FragmentParaEnd from './FragmentParaEnd';
import FragmentText from './FragmentText';
import IFragmentTextAttributes, { FragmentTextDefaultAttributes } from './FragmentTextAttributes';
import LayoutFrame from './LayoutFrame';
import ListItem from './ListItem';
import Paragraph from './Paragraph';
import QuoteBlock from './QuoteBlock';
// import Attachment from './Attachment';
// import CodeBlock from './CodeBlock';
// import Divide from './Divide';
// import Location from './Location';
// import Table from './Table';

/**
 * block 类型枚举
 */
export enum EnumBlockType {
  Paragraph = 'Paragraph',
  QuoteBlock = 'QuoteBlock',
  CodeBlock = 'CodeBlock',
  Divide = 'Divide',
  ListItem = 'ListItem',
  Location = 'Location',
  Attachment = 'Attachment',
  Table = 'Table',
}
export default class Document extends LinkedList<Block> implements IExportable {

  get selection(): IRange | null {
    return this._selection;
  }
  public em: EventEmitter = new EventEmitter();
  public width: number = 0;
  public height: number = 0;
  public length: number = 0;
  public readonly children: Block[] = [];
  public selectionRectangles: IRectangle[] = [];
  public delta = new Delta();
  // 选区变更时同时修改这个值和 nextFormat
  public currentFormat: { [key: string]: Set<any> } | null = null;
  // 选区长度为 0 时用工具栏改格式只改这个值，选区长度大于 0 时用工具栏改格式同时修改这个值和 currentFormat
  public nextFormat: { [key: string]: Set<any> } | null = null;

  private firstScreenRender = 0;
  private initLayout = false;
  private idleLayoutQueue: Block[] = [];
  private idleLayoutRunning = false;

  private startDrawingBlock: Block | null = null;
  private endDrawingBlock: Block | null = null;

  private _selection: IRange | null = null;

  private historyStack: ICommand[] = [];
  private historyCursor: number = -1;

  private compositionStartIndex: number = 0;

  public readFromChanges = (delta: Delta) => {
    this.firstScreenRender = 0;
    this.clear();
    this.delta = delta;
    const cache: Array<{ type: EnumBlockType; frames: Op[][] }> = [];
    let frameCache: Op[] = [];

    delta.forEach((op) => {
      const thisDataType = this.getBlockTypeFromOp(op);
      frameCache.push(op);
      if (thisDataType !== null) {
        cache.push({
          type: thisDataType,
          frames: [frameCache],
        });
        frameCache = [];
      }
    });

    for (let i = cache.length - 1; i > 0; i--) {
      const { type } = cache[i];
      if (type === cache[i - 1].type) {
        if (
          type === EnumBlockType.QuoteBlock ||
          type === EnumBlockType.CodeBlock
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
          // this.add(new Divide(editorConfig.canvasWidth));
          break;
        case EnumBlockType.Location:
          // const locationData = currentBat.frames[0][0].insert as any;
          // this.add(new Location(locationData.location));
          break;
        case EnumBlockType.Attachment:
          // const attachmentData = currentBat.frames[0][0].insert as any;
          // this.add(new Attachment(attachmentData.attachment, currentBat.frames[0][0].attributes));
          break;
        case EnumBlockType.Table:
          // this.add(new Table());
          break;
        case EnumBlockType.Paragraph:
          const frame = new LayoutFrame(
            currentBat.frames[0].map((change) => this.getFragmentFromOp(change)),
            currentBat.frames[0].slice(-1)[0].attributes,
          );
          this.add(new Paragraph(frame, editorConfig.canvasWidth));
          break;
        case EnumBlockType.QuoteBlock:
          const quoteFrames = currentBat.frames.map((bat) => {
            return new LayoutFrame(
              bat.map((change) => this.getFragmentFromOp(change)),
              bat.slice(-1)[0].attributes,
            );
          });
          this.add(new QuoteBlock(quoteFrames, editorConfig.canvasWidth));
          break;
        case EnumBlockType.ListItem:
          const listItemAttributes = currentBat.frames.slice(-1)[0].slice(-1)[0].attributes;

          const frameBat = splitIntoBat(currentBat.frames[0], (cur: any) => {
            return typeof cur.insert === 'object' && cur.insert['inline-break'] === true;
          }, true);

          const frames = frameBat.map((b) => {
            const frags = b.map((change: any) => this.getFragmentFromOp(change));
            return new LayoutFrame(frags, {});
          });

          this.add(new ListItem(frames, listItemAttributes, editorConfig.canvasWidth));
          break;
        case EnumBlockType.CodeBlock:
          // const codeFrames = currentBat.frames.map((bat) => {
          //   return new LayoutFrame(
          //     bat.map((change) => this.getFragmentFromOp(change)),
          //     bat.slice(-1)[0].attributes, editorConfig.canvasWidth,
          //   );
          // });
          // this.add(new CodeBlock(codeFrames));
          break;
      }
    }

    if (this.head !== null) {
      this.head.setStart(0, true, true);
    }
  }

  public applyChanges = (delta: Delta, pushHistory = true) => {
    let opOffset = 0;
    delta.forEach((op: Op) => {
      if (op.retain !== undefined) {
        if (op.attributes !== undefined && Object.keys(op.attributes).length > 0) {
          // this.format(opOffset, op.retain, op.attributes);
        }
        opOffset += op.retain;
      } else if (op.delete !== undefined) {
        // this.delete(opOffset, op.delete);
      } else {
        // this.insert(opOffset, op.insert);
      }
    });

    if (pushHistory) {
      this.pushHistory(delta, delta.invert(this.delta));
    }
    this.delta = this.delta.compose(delta);
  }

  /**
   * 清除当前文档中的所有数据
   */
  public clear() {
    this.delta = new Delta();
    this.historyStack.length = 0;
    this.historyCursor = -1;

    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].destroy();
    }
    this.removeAll();
  }

  /**
   * 绘制当前文档
   * @param ctx canvas context
   * @param scrollTop 文档滚动位置
   * @param viewHeight 可视区域高度
   */
  public draw(ctx: ICanvasContext, scrollTop: number, viewHeight: number) {
    this.startDrawingBlock = null;
    this.endDrawingBlock = null;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    let needRecalculateSelectionRect = false;
    let current = this.head;
    const viewportPosEnd = scrollTop + viewHeight;
    // 绘制的主要逻辑是，当前视口前面的内容只用排版不用绘制
    // 当前视口中的内容排版并绘制
    // 当前视口后面的内容，放到空闲队列里面排版
    while (current !== null) {
      if (current.y < viewportPosEnd) {
        needRecalculateSelectionRect = needRecalculateSelectionRect ||
          (
            this.selection !== null &&
            current.needLayout &&
            hasIntersection(
              this.selection.index,
              this.selection.index + this.selection.length,
              current.start,
              current.start + current.length,
            )
          );
        current.layout();
        if (current.y + current.height >= scrollTop) {
          current.draw(ctx, scrollTop);
          if (this.startDrawingBlock === null) {
            this.startDrawingBlock = current;
          }
        }
      } else if (current.needLayout) {
        if (this.firstScreenRender === 0) {
          this.firstScreenRender = window.performance.now() - (window as any).start;
          console.log('first screen finished ', this.firstScreenRender);
        }
        // 当前视口后面的内容，放到空闲队列里面排版
        this.startIdleLayout(current);
        this.endDrawingBlock = current;
        break;
      }
      current = current.nextSibling;
    }

    // 如果内容布局发生过变化，则选区也需要重新计算
    if (needRecalculateSelectionRect) {
      this.calSelectionRectangles();
    }
    // 绘制选区
    if (this.selectionRectangles.length > 0) {
      ctx.drawSelectionArea(this.selectionRectangles, scrollTop);
    }
    ctx.restore();
  }

  /**
   * 获取文档内容长度
   */
  public getLength(): number {
    return this.children.reduce((sum, currentBlock: Block) => {
      return sum + currentBlock.length;
    }, 0);
  }

  /**
   * 销毁当前文档
   */
  public destroy(): void {
    // TODO
    console.log('todo destroy document');
  }

  /**
   * 给文档设置新的尺寸信息
   * @param size 新尺寸信息
   */
  public setSize(size: { height?: number, width?: number }) {
    let changed = false;
    if (size.height) {
      this.height = size.height;
      changed = true;
    }
    if (size.width) {
      this.width = size.width;
      changed = true;
    }
    if (changed) {
      this.em.emit(EventName.DOCUMENT_CHANGE_SIZE, { width: this.width, height: this.height });
    }
  }

  public getDocumentPos = (x: number, y: number): number => {
    let targetChild;
    if (y < 0) {
      targetChild = this.head;
    } else if (y > this.height) {
      targetChild = this.tail;
    } else {
      targetChild = this.findChildrenInPos(x, y);
    }
    if (targetChild === null) { return -1; }
    return targetChild.getDocumentPos(x, y) + targetChild.start;
  }

  /**
   * 设置文档选区
   * @param index 位置索引
   * @param length 选区长度
   */
  public setSelection(range: IRange | null) {
    if (this._selection !== range) {
      if (range === null || this._selection === null) {
        this._selection = range;
      } else if (this._selection.index !== range.index || this._selection.length !== range.length) {
        this._selection = {
          index: range.index,
          length: range.length,
        };
      } else {
        // 如果新的 range 的 index 和 length 和之前的一样，就 do nothing
        return;
      }
      this.calSelectionRectangles();
      this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION, this._selection);
      this.updateCurrentFormat();
    }
  }

  /**
   * 将当前文档输出为 delta
   */
  public toDelta(): Delta {
    return this.delta;
  }

  /**
   * 将当前文档输出为 HTML
   */
  public toHtml(): string {
    return this.children.map((block) => block.toHtml()).join('');
  }

  /**
   * 添加一条操作
   */
  public pushHistory(redo: Delta, undo: Delta) {
    const command: ICommand = {
      redo,
      undo,
    };
    this.historyStack.length = this.historyCursor + 1;
    this.historyStack.push(command);
    this.historyCursor++;
  }

  /**
   * 获取重做下一步操作的 delta
   */
  public redo() {
    if (this.historyCursor < this.historyStack.length - 1) {
      const res = this.historyStack[this.historyCursor + 1].redo;
      this.historyCursor++;
      this.applyChanges(res, false);
    }
  }

  /**
   * 获取撤销上一步操作的 delta
   */
  public undo() {
    if (this.historyCursor >= 0) {
      const res = this.historyStack[this.historyCursor].undo;
      this.historyCursor--;
      this.applyChanges(res, false);
    }
  }

  /**
   * 根据远端的 change 来 rebase stack 中所有操作
   * @param change 远端的 change
   */
  public rebase(change: Delta) {
    for (let index = 0; index < this.historyStack.length; index++) {
      const command = this.historyStack[index];
      command.redo = change.transform(command.redo);
      command.undo = change.transform(command.undo);
    }
  }

  /**
   * 插入操作
   * @param content 要插入的内容
   */
  public insertText(content: string, selection: IRange, attr: Partial<IFragmentTextAttributes>, composing = false) {
    // 如果当前有选区就先把选择的内容删掉再插入新内容
    if (selection.length > 0) {
      this.delete(selection);
    }

    const { index, length } = selection;
    const blocks = this.findBlocksByRange(index, length);

    // 因为这里的 length 长度只能是 0，所以 blocks.length 只能是 1 或 2
    // 那么如果是 1 说明就是在这个 block 里面插入，如果是 2，则肯定是在后面一个 block 的最前面插入内容
    const blocksLength = blocks.length;
    if (blocksLength <= 0) { return; }
    const hasDiffFormat = this.currentFormat !== this.nextFormat;
    blocks[blocksLength - 1].insertText(content, index - blocks[blocksLength - 1].start, hasDiffFormat, attr, composing);

    if (this.head !== null) {
      this.head.setPositionY(0, true, true);
      this.head.setStart(0, true, true);
    }

    // 这里要先触发 change 事件，然后在设置新的 selection
    // 因为触发 change 之后才能计算文档的新结构和长度，在这之前设置 selection 可能会导致错误
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
    const newIndex = composing ? this.compositionStartIndex + content.length : index + content.length;
    this.setSelection({ index: newIndex, length: 0 });
  }

  /**
   * 删除操作，删除选区范围的内容并将选区长度置为 0
   * @param forward true: 向前删除，相当于退格键； false：向后删除，相当于 win 上的 del 键
   */
  public delete(selection: IRange, forward: boolean = true) {
    let { index, length } = selection;

    const affectedListId: Set<string> = new Set();

    if (length === 0 && forward) {
      // 进入这个分支表示选取长度为 0，而且是向前删除（backspace 键）
      // 这种删除情况比较复杂，先考虑一些特殊情况，如果不属于特殊情况，再走普通删除流程

      const targetBlock = this.findBlocksByRange(index, 0)[0];
      // 如果当前 block 是 ListItem，就把当前 ListItem 中每个 frame 转为 paragraph
      // 如果当前 block 是其他除 paragraph 以外的 block，就把当前 block 的第一个 frame 转为 paragraph
      if (index - targetBlock.start === 0 && !(targetBlock instanceof Paragraph)) {
        let frames: LayoutFrame[];
        let posBlock: Block | null;
        if (targetBlock instanceof ListItem) {
          affectedListId.add(targetBlock.attributes.listId);
          frames = targetBlock.children;
          this.remove(targetBlock);
          posBlock = targetBlock.nextSibling;
        } else {
          frames = [targetBlock.children[0]];
          if (targetBlock.children.length === 1) {
            posBlock = targetBlock.nextSibling;
            this.remove(targetBlock);
          } else {
            targetBlock.remove(targetBlock.children[0]);
            posBlock = targetBlock;
          }
        }

        const paragraphs = frames.map((frame) => {
          return new Paragraph(frame, editorConfig.canvasWidth);
        });

        if (posBlock !== null) {
          paragraphs.forEach((para) => { this.addBefore(para, posBlock!); });
        } else {
          this.addAll(paragraphs);
        }

        if (this.head !== null) {
          this.head.setPositionY(0, true, true);
          this.head.setStart(0, true, true);
        }

        this.markListItemToLayout(affectedListId);
        this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
        return;
      }
    }

    if (forward && length === 0) {
      index--;
      length++;
    }
    const blocks = this.findBlocksByRange(index, length);
    if (blocks.length <= 0) { return; }
    let blockMerge = blocks.length > 0 &&
      blocks[0].start < index &&
      index + length >= blocks[0].start + blocks[0].length;

    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex];
      if (index <= element.start && index + length >= element.start + element.length) {
        this.remove(element);
        if (element instanceof ListItem) {
          affectedListId.add(element.attributes.listId);
        }
      } else {
        const offsetStart = Math.max(index - element.start, 0);
        element.delete(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        );
      }
    }

    // 删除了相应对象之后还要做合并操作，用靠前的 block 吃掉后面的 block
    blockMerge = blockMerge && blocks[0].isHungry();
    if (blockMerge && blocks[0].nextSibling !== null) {
      const needRemove = blocks[0].eat(blocks[0].nextSibling);
      if (needRemove) {
        if (blocks[0].nextSibling instanceof ListItem) {
          affectedListId.add(blocks[0].nextSibling.attributes.listId);
        }
        this.remove(blocks[0].nextSibling);
      }
    }

    // 如果中间有删除过整个 block，就可能需要重设所有 block 的 start
    if (this.head !== null) {
      this.head.setPositionY(0, true, true);
      this.head.setStart(0, true, true);
    }

    // 对于受影响的列表的列表项全部重新排版
    this.markListItemToLayout(affectedListId);

    // 触发 change
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
    this.setSelection({index, length: 0});
  }

  /**
   * 在指定位置用输入法开始插入内容
   * @param selection 要开始输入法输入的选区范围
   * @param attr 输入的格式
   */
  public startComposition(selection: IRange, attr: Partial<IFragmentTextAttributes>) {
    this.compositionStartIndex = selection.index;
    if (selection.length > 0) {
      this.delete(selection);
    }
    this.format({ ...attr, composing: true }, { index: selection.index, length: 0 });
  }

  /**
   * 更新输入法输入的内容
   * @param content 输入法中最新的输入内容
   * @param attr 输入的格式
   */
  public updateComposition(content: string, attr: Partial<IFragmentTextAttributes>) {
    if (this._selection) {
      this.insertText(content, {index: this._selection.index, length: 0}, attr, true);
    } else {
      console.error('this._selection should not be empty when update composition');
    }
  }

  /**
   * 结束输入法输入
   * @param length 输入法输入内容的长度
   */
  public endComposition(length: number) {
    this.format({ composing: false }, { index: this.compositionStartIndex, length });
  }

  /**
   * 给指定范围设置新的文档格式
   * @param attr 新格式数据
   * @param selection 需要设置格式的范围
   */
  public format(attr: IFragmentOverwriteAttributes, selection: IRange) {
    const { index, length } = selection;

    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst);
    if (blocks.length <= 0) { return; }
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex];
      const offsetStart = Math.max(index - element.start, 0);
      element.format(
        attr,
        offsetStart,
        Math.min(element.start + element.length, index + length) - element.start - offsetStart,
      );
    }

    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
    this.updateCurrentFormat();
    // 如果长度是 0，还有尝试修改 nextFormat
    if (length === 0) {
      this.updateNextFormat(attr);
    }
  }

  /**
   * 清除选区范围内容的格式
   * @param selection 需要清除格式的选区范围
   */
  public clearFormat(selection: IRange) {
    const blocks = this.findBlocksByRange(selection.index, selection.length, EnumIntersectionType.rightFirst);
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex];
      const offsetStart = Math.max(selection.index - element.start, 0);
      element.clearFormat(
        offsetStart,
        Math.min(element.start + element.length, selection.index + selection.length) - element.start - offsetStart,
      );
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
  }

  /**
   * 获取指定范围的文档内容格式信息
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public getFormat(index: number, length: number): { [key: string]: Set<any> } {
    const res: { [key: string]: Set<any> } = {};
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst);
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const element = blocks[blockIndex];
      const offsetStart = Math.max(index - element.start, 0);
      collectAttributes(
        element.getFormat(
          offsetStart,
          Math.min(element.start + element.length, index + length) - element.start - offsetStart,
        ), res);
    }
    return res;
  }

  /**
   * 设置缩进
   * @param increase true:  增加缩进 false: 减少缩进
   */
  public setIndent(increase: boolean, index: number, length: number) {
    const blocks = this.findBlocksByRange(index, length, EnumIntersectionType.rightFirst);
    for (let i = 0; i < blocks.length; i++) {
      blocks[i].setIndent(increase, index, length);
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
  }

  /**
   * 在指定位置设置 quoteblock
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public setQuoteBlock(index: number, length: number) {
    const blocks = this.findBlocksByRange(index, length);
    const quoteBlocks = blocks.filter((blk: Block) => blk instanceof QuoteBlock);
    if (quoteBlocks.length === blocks.length) {
      // 如果所有的 block 都是 quoteblock 就取消所有的 quoteblock
      this.setParagraph(index, length);
    } else {
      // 如果存在不是 quoteblock 的 block，就把他设置成 quoteblock，注意这里可能还需要合并前后的 quoteblock
      let startQuoteBlock: QuoteBlock;
      if (blocks[0].prevSibling instanceof QuoteBlock) {
        startQuoteBlock = blocks[0].prevSibling;
      } else {
        startQuoteBlock = new QuoteBlock([], editorConfig.canvasWidth);
        this.addBefore(startQuoteBlock, blocks[0]);
      }
      for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
        const element = blocks[blocksIndex];
        const frames = element.removeAll();
        startQuoteBlock.addAll(frames);
        this.remove(element);
      }
      if (startQuoteBlock.nextSibling instanceof QuoteBlock) {
        const frames = startQuoteBlock.nextSibling.removeAll();
        startQuoteBlock.addAll(frames);
        this.remove(startQuoteBlock.nextSibling);
      }
      startQuoteBlock.needLayout  = true;

      if (this.head !== null) {
        this.head.setPositionY(0, true, true);
        this.head.setStart(0, true, true);
      }
      this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
    }
  }

  /**
   * 在指定位置设置 list
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public setList(listType: EnumListType, index: number, length: number) {
    const affectedListId = new Set<string>();
    const blocks = this.findBlocksByRange(index, length);
    const newListId = guid();
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
      const block = blocks[blockIndex];
      if (block instanceof ListItem) {
        // 如果本身就是 listitem 就直接改 listType，并且统一 listId
        affectedListId.add(block.attributes.listId);
        block.format({
          listType,
          listId: newListId,
        }, 0, block.length);
        block.needLayout = true;
      } else {
        // 如果本身不是 listitem，就把他的每一个 frame 拆出来构建一个 listitem
        const frames = block.removeAll();
        for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
          const frame = frames[frameIndex];
          const listItemOriginAttributes: any = {};
          switch (listType) {
            case EnumListType.ol_1:
              listItemOriginAttributes.ordered = 'decimal';
            case EnumListType.ol_2:
              listItemOriginAttributes.ordered = 'ckj-decimal';
            case EnumListType.ol_3:
              listItemOriginAttributes.ordered = 'upper-decimal';
              listItemOriginAttributes['list-id'] = newListId;
              break;
            case EnumListType.ul_1:
              listItemOriginAttributes.bullet = 'decimal';
            case EnumListType.ul_2:
              listItemOriginAttributes.bullet = 'ring';
            case EnumListType.ul_3:
              listItemOriginAttributes.bullet = 'arrow';
              listItemOriginAttributes['bullet-id'] = newListId;
              break;
            default:
              listItemOriginAttributes.ordered = 'decimal';
              listItemOriginAttributes['list-id'] = newListId;
              break;
          }
          const newListItem = new ListItem([frame], listItemOriginAttributes, editorConfig.canvasWidth);
          this.addBefore(newListItem, block);
        }
        this.remove(block);
      }
    }

    if (this.head !== null) {
      this.head.setPositionY(0, true, true);
      this.head.setStart(0, true, true);
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
  }

  /**
   * 在指定位置设置 paragraph
   * @param index 范围开始位置
   * @param length 范围长度
   */
  public setParagraph(index: number, length: number) {
    const blocks = this.findBlocksByRange(index, length);
    for (let blocksIndex = 0; blocksIndex < blocks.length; blocksIndex++) {
      const frames = blocks[blocksIndex].removeAll();
      for (let framesIndex = 0; framesIndex < frames.length; framesIndex++) {
        const frame = frames[framesIndex];
        this.addBefore(new Paragraph(frame, editorConfig.canvasWidth), blocks[blocksIndex]);
      }
      this.remove(blocks[blocksIndex]);
    }
    if (this.head !== null) {
      this.head.setPositionY(0, true, true);
      this.head.setStart(0, true, true);
    }
    this.em.emit(EventName.DOCUMENT_CHANGE_CONTENT);
  }

  //#region override LinkedList method
  /**
   * 将一个 block 添加到当前 block
   * @param node 要添加的 block
   */
  public add(node: Block) {
    super.add(node);
    node.setMaxWidth(editorConfig.canvasWidth);
    node.start = this.length;
    this.length += node.length;
  }

  /**
   * 在目标 block 实例前插入一个 block
   * @param node 要插入的 block 实例
   * @param target 目标 block 实例
   */
  public addBefore(node: Block, target: Block) {
    super.addBefore(node, target);
    node.setMaxWidth(editorConfig.canvasWidth);
    const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length;
    node.setStart(start, true, true);
    this.length += node.length;
    if (node instanceof ListItem) {
      this.markListItemToLayout((new Set<string>()).add(node.attributes.listId));
    }
  }

  /**
   * 在目标 block 实例后插入一个 block
   * @param node 要插入的 block 实例
   * @param target 目标 block 实例
   */
  public addAfter(node: Block, target: Block) {
    super.addAfter(node, target);
    node.setMaxWidth(editorConfig.canvasWidth);
    node.setStart(target.start + target.length, true, true);
    this.length += node.length;
    if (node instanceof ListItem) {
      this.markListItemToLayout((new Set<string>()).add(node.attributes.listId));
    }
  }

  /**
   * 清楚当前 doc 中所有 block
   */
  public removeAll() {
    this.length = 0;
    return super.removeAll();
  }

  /**
   * 从当前 doc 删除一个 block
   * @param node 要删除的 block
   */
  public remove(node: Block) {
    if (node.nextSibling !== null) {
      const start = node.prevSibling === null ? 0 : node.prevSibling.start + node.prevSibling.length;
      node.nextSibling.setStart(start, true, true);
    }

    super.remove(node);
    this.length -= node.length;
    if (node instanceof ListItem) {
      this.markListItemToLayout((new Set<string>()).add(node.attributes.listId));
    }
  }
  //#endregion

  /**
   * 在 document 里面找到设计到 range 范围的 block
   * @param index range 的开始位置
   * @param length range 的长度
   */
  private findBlocksByRange(index: number, length: number, intersectionType = EnumIntersectionType.both): Block[] {
    return findChildrenByRange<Block>(this.children, this.length, index, length, intersectionType);
  }

  /**
   * 获取指定坐标处的 block 信息
   * @param x x 坐标
   * @param y y 坐标
   */
  private findChildrenInPos(x: number, y: number): Block | null {
    let current = this.head;
    if (current !== null) {
      while (current !== null && (y < current.y || y > current.y + current.height)) {
        current = current.nextSibling === this.endDrawingBlock ? null : current.nextSibling;
      }
    }
    return current;
  }

  /**
   * 计算某条 change 数据对应的 block type，null 表示普通行内数据
   * @param op 结构化的 delta 数据
   */
  private getBlockTypeFromOp(op: Op): EnumBlockType | null {
    let thisBlockType = null;
    const data = op.insert;
    if (data === '\n') {
      if (op.attributes && op.attributes.blockquote) {
        thisBlockType = EnumBlockType.QuoteBlock;
      } else if (op.attributes && op.attributes['code-block']) {
        thisBlockType = EnumBlockType.CodeBlock;
      } else if (op.attributes && (op.attributes['list-id'] || op.attributes['bullet-id'])) {
        thisBlockType = EnumBlockType.ListItem;
      } else {
        thisBlockType = EnumBlockType.Paragraph;
      }
    } else if (typeof data === 'object') {
      if (data.hasOwnProperty('location')) {
        thisBlockType = EnumBlockType.Location;
      } else if (data.hasOwnProperty('attachment')) {
        thisBlockType = EnumBlockType.Attachment;
      } else if (data.hasOwnProperty('divide')) {
        thisBlockType = EnumBlockType.Divide;
      } else if (data.hasOwnProperty('rows') && data.hasOwnProperty('cols')) {
        thisBlockType = EnumBlockType.Table;
      }
    }

    return thisBlockType;
  }

  /**
   * 根据 change 信息生成 fragment
   */
  private getFragmentFromOp(op: Op): Fragment {
    const data = op.insert as any;
    const attributes = op.attributes as any;
    // 如果 data 是字符串说明是文字性内容
    if (typeof data === 'string') {
      if (data !== '\n') {
        // 如果不是换行符说明是普通内容
        return new FragmentText(attributes, data);
      } else {
        return new FragmentParaEnd(op);
      }
    } else if (typeof data === 'object') {
      if (data['gallery-block'] !== undefined || data.gallery !== undefined) {
        // 如果 gallery-block 存在说明是图片
        return new FragmentImage(op, attributes, data.gallery || data['gallery-block']);
      } else if (data['date-mention'] !== undefined) {
        // 如果 date-mention 存在说明是日期
        return new FragmentDate(op, attributes, data['date-mention']);
      } else if (data['inline-break'] === true) {
        // 如果是 list item 里的换行
        return new FragmentParaEnd(op);
      }
    }
    throw new Error('unknown fragment');
  }

  /**
   * 开始 idle layout
   * @param block layout 起始 block
   */
  private startIdleLayout(block: Block) {
    this.idleLayoutQueue.push(block);
    if (!this.idleLayoutRunning) {
      requestIdleCallback(this.runIdleLayout);
    }
  }

  private runIdleLayout = (deadline: { timeRemaining: () => number, didTimeout: boolean }) => {
    if (this.idleLayoutQueue.length > 0) {
      this.idleLayoutRunning = true;
      let currentBlock: Block | undefined | null = this.idleLayoutQueue.shift();
      let needRecalculateSelectionRect = false;
      while (deadline.timeRemaining() > 5 && currentBlock !== undefined && currentBlock !== null) {
        if (currentBlock.needLayout) {
          needRecalculateSelectionRect = needRecalculateSelectionRect ||
          (
            this.selection !== null &&
            currentBlock.needLayout &&
            hasIntersection(
              this.selection.index,
              this.selection.index + this.selection.length,
              currentBlock.start,
              currentBlock.start + currentBlock.length,
            )
          );
          currentBlock.layout();
          currentBlock = currentBlock.nextSibling;
        } else {
          currentBlock = null;
          break;
        }
      }

      if (needRecalculateSelectionRect) {
        this.calSelectionRectangles();
      }
      if (currentBlock !== null && currentBlock !== undefined) {
        // 说明还没有排版完成
        this.idleLayoutQueue.unshift(currentBlock);
        // 如果初次排版都没有完成，就要更新一次文档高度
        if (this.initLayout === false) {
          this.setSize({ height: currentBlock.y });
        }
      }
      setTimeout(() => {
        requestIdleCallback(this.runIdleLayout);
      }, 4);
    } else {
      this.idleLayoutRunning = false;
      this.initLayout = true;
      console.log('idle finished', performance.now() - (window as any).start);
    }
  }

  /**
   * 计算选区矩形位置，文档中光标的位置也是根据这个值得来的
   */
  private calSelectionRectangles() {
    this.selectionRectangles = [];
    if (this._selection !== null) {
      const { index, length } = this._selection;
      this.findBlocksByRange(index, length).forEach((block) => {
        this.selectionRectangles = this.selectionRectangles.concat(block.getSelectionRectangles(index, length));
      });
      this.em.emit(EventName.DOCUMENT_CHANGE_SELECTION_RECTANGLE);
    }
  }

  /**
   * 将指定 list id 的 listitem 标记为需要排版
   * @param listIds list id
   */
  private markListItemToLayout(listIds: Set<string>) {
    if (listIds.size > 0) {
      for (let blockIndex = 0; blockIndex < this.children.length; blockIndex++) {
        const element = this.children[blockIndex];
        if (element instanceof ListItem && listIds.has(element.attributes.listId)) {
          element.needLayout = true;
        }
      }
    }
  }

  /**
   * 根据当前选区更新当前选区格式
   */
  private updateCurrentFormat() {
    if (this.selection === null) {
      this.currentFormat = null;
    } else {
      const { index, length } = this.selection;
      this.currentFormat = this.getFormat(index, length);
    }
    this.nextFormat = this.currentFormat;
    this.em.emit(EventName.DOCUMENT_CHANGE_FORMAT, this.nextFormat);
  }

  /**
   * 更新 nextFormat
   * @param attr 更新的样式内容
   */
  private updateNextFormat(attr: IFragmentOverwriteAttributes) {
    if (this.nextFormat === null) {
      console.error('the nextFormat should not be null');
      return;
    }
    let formatChanged = false;

    const keys = Object.keys(attr);
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      if (this.nextFormat.hasOwnProperty(key) && !this.nextFormat[key].has(attr[key])) {
        this.nextFormat[key] = (new Set().add(attr[key]));
        formatChanged = true;
      }
    }

    if (formatChanged) {
      this.nextFormat = { ...this.nextFormat };
      this.em.emit(EventName.DOCUMENT_CHANGE_FORMAT, this.nextFormat);
    }
  }
}
