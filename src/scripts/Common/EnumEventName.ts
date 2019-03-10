export enum EventName {
  EDITOR_CHANGE_SIZE = 'EDITOR_CHANGE_SIZE',
  EDITOR_SELECTION_CHANGE = 'EDITOR_SELECTION_CHANGE',
  EDITOR_CONTENT_CHANGE = 'EDITOR_CONTENT_CHANGE',
  EDITOR_USER_CHANGE = 'EDITOR_USER_CHANGE',

  DOCUMENT_CHANGE_SIZE = 'DOCUMENT_CHANGE_SIZE',
  DOCUMENT_PARAGRAPH_ADD = 'DOCUMENT_PARAGRAPH_ADD',
  DOCUMENT_PARAGRAPH_REMOVE = 'DOCUMENT_PARAGRAPH_REMOVE',
  PARAGRAPH_FRAGMENT_ADD = 'PARAGRAPH_FRAGMENT_ADD',
  PARAGRAPH_FRAGMENT_REMOVE = 'PARAGRAPH_FRAGMENT_REMOVE',
  FRAGMENT_CHANGE = 'FRAGMENT_CHANGE',

  RUN_CHANGE_SIZE = 'RUN_CHANGE_SIZE',
  LINE_CHANGE_SIZE = 'LINE_CHANGE_SIZE',
  FRAME_CHANGE_SIZE = 'FRAME_CHANGE_SIZE',
}
