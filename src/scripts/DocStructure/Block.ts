import Op from 'quill-delta-enhanced/dist/Op'
import ICanvasContext from '../Common/ICanvasContext'
import IRectangle from '../Common/IRectangle'
import { ILinkedListNode } from '../Common/LinkedList'
import { increaseId } from '../Common/util'
import Document from './Document'
import { IFormatAttributes } from './FormatAttributes'
import LayoutFrame from './LayoutFrame'
import ILayoutFrameAttributes from './LayoutFrameAttributes'
import { IRenderStructure } from '../Common/IRenderStructure'
import { EnumCursorType } from '../Common/EnumCursorType'
import IRange from '../Common/IRange'
import { IBubbleUpable } from '../Common/IBubbleElement'
import { ISearchResult } from '../Common/ISearchResult'
import Delta from 'quill-delta-enhanced'
import IFragmentTextAttributes from './FragmentTextAttributes'
import { IPointerInteractive } from '../Common/IPointerInteractive'
import { DocPos } from '../Common/DocPos'

export default abstract class Block implements ILinkedListNode, IRenderStructure, IBubbleUpable {
  public static readonly blockType: string = 'block'
  // needCorrectSelectionPos 表示是否需要修正计算实际选区，比如 Table 元素
  // 用户从 table 前面的元素开始按下鼠标，到 table 中第二行第二个单元格松开鼠标
  // 此时选区的结束位置是鼠标实际指向的位置，但 table 的选区需求要求此时要选中 table 的前两行
  // 所以 table 的选区实际范围并不直接用鼠标的起始位置得来，还要经过 correctSelectionPos 的计算
  // 这样的元素需要将 needCorrectSelectionPos 置为 true，并实现自己的 correctSelectionPos 方法
  public readonly needCorrectSelectionPos: boolean = false
  public readonly id: number = increaseId();
  public prevSibling: this | null = null;
  public nextSibling: this | null = null;
  public parent: Document | null = null;

  public start: number = 0;
  public length: number = 0;

  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;
  public needLayout: boolean = true;
  public readonly needMerge: boolean = false;  // 是否需要把相邻的同类型 block 合并

  protected isPointerHover: boolean = false;

  public destroy() {
    this.prevSibling = null
    this.nextSibling = null
    this.needLayout = false
  }

  /**
   * 绘制当前 block 到 canvas
   * @param ctx canvas 上下文
   * @param viewHeight 整个画布的高度
   * @returns 绘制过程中当前 block 高度是否发生变化
   */
  public draw(ctx: ICanvasContext, x: number, y: number, viewHeight: number) {
    if ((window as any).blockBorder) {
      ctx.save()
      ctx.strokeStyle = 'green'
      ctx.strokeRect(this.x + x, this.y + y, this.width, this.height)
      ctx.restore()
    }
  }

  /**
   * 设置当前 block 的 y 轴位置
   * @param pos 位置信息对象
   */
  public setPositionY(y: number, recursive = true, force = false): void {
    if (force === true || this.y !== y) {
      y = Math.floor(y)
      this.y = y
      // 如果 needLayout 为 true 就不用设置后面的元素的 positionY 了，layout 的时候会设置的
      if (recursive && !this.needLayout) {
        let currentBlock = this
        let nextSibling = this.nextSibling
        while (nextSibling !== null) {
          nextSibling.y = (Math.floor(currentBlock.y + currentBlock.height))
          currentBlock = nextSibling
          nextSibling = currentBlock.nextSibling
        }
        if (this.parent !== null) {
          const tailBlock = this.parent.tail
          this.parent.setContentHeight(tailBlock!.y + tailBlock!.height)
        }
      }
    }
  }

  /**
   * 设置当前 block 的 start
   * @param recursive 是否依次更新当前 block 后面的 block 的 start
   * @param force 是否强制更新（就算新设的值和目前的值相同也更新）
   * @param canBreak 是否允许中断，如果给某个 block  将要设置的 start 值与该 block 目前的 start 值相同，是否中断
   */
  public setStart(index: number, recursive = false, force = false, canBreak = false): void {
    if (force === true || this.start !== index) {
      this.start = index
      if (recursive) {
        let currentBlock: Block = this
        let nextSibling = currentBlock.nextSibling
        while (nextSibling !== null) {
          if (canBreak && nextSibling.start === currentBlock.start + currentBlock.length) {
            break
          }
          nextSibling.start = currentBlock.start + currentBlock.length
          currentBlock = nextSibling
          nextSibling = currentBlock.nextSibling
        }
        if (this.parent && this.parent.tail) {
          this.parent.length = this.parent.tail!.start + this.parent.tail!.length
        }
      }
    }
  }

  /**
   * 设置当前 block 的 size，并且如果当前 block 是它的父级的最后一个 block 的话，还会顺便更新父级的 size
   */
  public setSize(size: { height?: number, width?: number }) {
    let widthChanged = false
    if (size.height) {
      this.height = size.height
      widthChanged = true
    }
    if (size.width) {
      this.width = size.width
    }
    if (this.nextSibling === null && widthChanged && this.parent !== null) {
      this.parent.setContentHeight(this.y + size.height!)
    }
  }

  public getCursorType(): EnumCursorType {
    return EnumCursorType.Default
  }

  public bubbleUp(type: string, data: any, stack: any[]) {
    if (this.parent) {
      stack.push(this)
      this.parent.bubbleUp(type, data, stack)
    }
  }

  public isHungry(): boolean {
    return false
  }

  public eat(block: Block): boolean {
    return false
  }

  public applyChanges(delta: Delta): void { /* empty function, override if needed */ }

  /**
   * 计算当前 block 的实际选区范围或选区端点范围
   *
   * 注意：如果参数 start、end 中某一个为 null，则返回数组长度必定是 1，且其中唯一元素的 start、end 也必定是 null
   * 如果参数 start、end 都不是 null，则 needCorrectSelectionPos === true 的 block 元素必定原样返回参数
   * 若 needCorrectSelectionPos !== true，则有可能会范围一个包含多个选区范围的数组，比如 Table 的实现
   */
  public correctSelectionPos(start: DocPos | null, end: DocPos | null):
    Array<{ start: DocPos | null, end: DocPos | null }> {
    return [{ start, end }]
  }

  /**
   * 重新排版当前 block
   */
  public abstract layout(): void

  public abstract search(keywords: string, trigger?: boolean): ISearchResult[]

  /**
   * 获取指定坐标在文档中的逻辑位置信息
   * 包含该位置在文档中的 DocPos 信息
   * @param x x 坐标
   * @param y y 坐标
   * @param start
   * start 为 true 表示 selectionController 尝试开始建立选区，一般就是鼠标左键按下的时候，
   * 但有些元素在某些情况下鼠标左键按下不能开始建立选区，比如 table，当鼠标悬停在 table 边框上按下鼠标，
   * 此时用户应该是想调整表格高度、行高、列宽等，所以这种时候就返回 null 防止 selectionController 建立选区
   */
  public abstract getDocumentPos(x: number, y: number, start: boolean): DocPos | null

  /**
   * 根据选区获取选区矩形区域
   * @param start 选区相对当前 block 的开始位置
   * @param end 选区相对当前 block 的结束位置
   * @param {number | undefined} correctByPosY 用实际鼠标 y 坐标修正结果，在选区长度为 0 计算光标位置的时候要用这个参数
   */
  public abstract getSelectionRectangles(start: DocPos, end: DocPos, correctByPosY?: number): IRectangle[]

  public abstract getChildrenStackByPos(x: number, y: number): Array<IRenderStructure>

  /**
   * 在指定位置插入一个换行符
   */
  public abstract insertEnter(index: number, attr?: Partial<ILayoutFrameAttributes>): Block | null

  /**
   * 将当前 block 输出为 delta
   */
  public abstract toOp(): Op[]

  public abstract readFromOps(Ops: Op[]): void

  /**
   * 将当前 block 输出为 html
   */
  public abstract toHtml(selection?: IRange): string

  public abstract insertText(content: string, index: number, hasDiffFormat: boolean, attr?: Partial<IFragmentTextAttributes>, composing?: boolean): void

  public abstract getFormat(index: number, length: number): { [key: string]: Set<any> }

  public abstract format(attr: IFormatAttributes, index: number, length: number): void

  public abstract clearFormat(index: number, length: number): void

  public abstract replace(index: number, length: number, replaceWords: string): Op[]

  public abstract delete(index: number, length: number): void

  public abstract getAllLayoutFrames(): LayoutFrame[]

  public abstract merge(target: this): void

  public abstract onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void
  public abstract onPointerLeave(): void
  public abstract onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void
  public abstract onPointerDown(x: number, y: number): void
  public abstract onPointerUp(x: number, y: number): void
  public abstract onPointerTap(x: number, y: number): void

  /**
   * 将 Op 读成 LayoutFrame
   * 这是一个给 block 的子类使用的工具方法
   */
  protected readOpsToLayoutFrame(ops: Op[]): LayoutFrame[] {
    const frames: LayoutFrame[] = []
    const opCache: Op[] = []
    for (let index = 0; index < ops.length; index++) {
      const op = ops[index]
      opCache.push(op)
      if (typeof op.attributes?.frag === 'string' && op.attributes.frag === 'end') {
        const frame = new LayoutFrame()
        frame.readFromOps(opCache)
        opCache.length = 0
        frames.push(frame)
      }
    }
    return frames
  }

  /**
   * 修改当前 block 的 attributes
   * @param attr 需要修改的 attributes
   */
  protected formatSelf(attr: IFormatAttributes, index?: number, length?: number): void { /** empty function */ }

  /**
   * 清除格式时重置当前 block 的格式到默认状态
   * @param index 选区方位开始位置
   * @param length 选区长度
   */
  protected clearSelfFormat(index?: number, length?: number): void { /** empty function */ }

  /**
   * 给某个 layoutframe 设置最大宽度为当前 block 的最大宽度
   * @param node layoutframe
   */
  protected setChildrenMaxWidth(node: LayoutFrame): void {
    node.setMaxWidth(this.width)
  }

  /**
   * 给最后一条 op 设置表示 block 类型的 attribute
   */
  protected setBlockOpAttribute(Ops: Op[], blockType: string): boolean {
    if (Ops.length === 0) return false
    Object.assign(Ops[Ops.length - 1].attributes, { block: blockType })
    return true
  }
}
