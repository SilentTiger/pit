
export interface IBubbleUpable {
  /**
   * 接受下级发来的冒泡消息
   * @param type 消息类型
   * @param data 消息数据
   * @param stack 消息冒泡顺序
   */
  bubbleUp(type: string, data: any, stack: any[]): void
}
