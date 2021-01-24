/**
 * 事件枚举
 */
export enum EventName {
  EDITOR_CHANGE_SIZE = 'EDITOR_CHANGE_SIZE',
  EDITOR_CHANGE_FORMAT = 'EDITOR_CHANGE_FORMAT',
  EDITOR_COMPOSITION_START = 'EDITOR_COMPOSITION_START',
  EDITOR_COMPOSITION_UPDATE = 'EDITOR_COMPOSITION_UPDATE',
  EDITOR_COMPOSITION_END = 'EDITOR_COMPOSITION_END',
  EDITOR_CHANGE_SEARCH_RESULT = 'EDITOR_CHANGE_SEARCH_RESULT',

  EDITOR_CHANGE_HISTORY_STACK = 'EDITOR_CHANGE_HISTORY_STACK',
  EDITOR_CHANGE_CONTENT = 'EDITOR_CHANGE_CONTENT',

  CHANGE_SELECTION = 'CHANGE_SELECTION',
  DOCUMENT_CHANGE_SIZE = 'DOCUMENT_CHANGE_SIZE',
  DOCUMENT_CHANGE_CONTENT = 'DOCUMENT_CHANGE_CONTENT',
  DOCUMENT_CHANGE_FORMAT = 'DOCUMENT_CHANGE_FORMAT',

  DOCUMENT_CHANGE_SEARCH_RESULT = 'DOCUMENT_CHANGE_SEARCH_RESULT',

  DOCUMENT_NEED_LAYOUT = 'DOCUMENT_NEED_LAYOUT',
  DOCUMENT_NEED_DRAW = 'DOCUMENT_NEED_DRAW',

  DOCUMENT_AFTER_LAYOUT = 'DOCUMENT_AFTER_LAYOUT', // 执行了 Document.draw 方法
  DOCUMENT_AFTER_DRAW = 'DOCUMENT_AFTER_DRAW', // 执行了 Document.fastDraw 方法
  DOCUMENT_AFTER_IDLE_LAYOUT = 'DOCUMENT_AFTER_IDLE_LAYOUT', // 执行了 Document.runIdleLayout 方法
  DOCUMENT_LAYOUT_FINISH = 'DOCUMENT_LAYOUT_FINISH', // 执行了 Document.runIdleLayout 方法，切全文排版完成

  SEARCH_NEED_DRAW = 'SEARCH_NEED_DRAW', // 需要重绘搜索结果
  SEARCH_RESULT_CHANGE = 'SEARCH_RESULT_CHANGE', // 需要重绘搜索结果

  HISTORY_STACK_CHANGE = 'HISTORY_STACK_CHANGE',
}
