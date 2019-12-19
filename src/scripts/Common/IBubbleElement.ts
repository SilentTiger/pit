import LayoutFrame from '../DocStructure/LayoutFrame'
import Line from '../RenderStructure/Line'
import Fragment from '../DocStructure/Fragment'
import Block from '../DocStructure/Block'
import Run from '../RenderStructure/Run'

export interface IBubbleUpable {
  /**
   * 接受下级发来的冒泡消息
   * @param type 消息类型
   * @param data 消息数据
   * @param stack 消息冒泡顺序
   */
  bubbleUp(type: string, data: any, stack: TypeBubbleElement[]): void
}

/**
 * 可以进行冒泡消息传递的类型
 */
export type TypeBubbleElement = Document | Block | LayoutFrame | Line | Run | Fragment
