import EventEmitter from 'eventemitter3'
import Editor from '../Editor'

export default class InputController {
  public em = new EventEmitter()
  private editor: Editor
  private doc: Document

  constructor(editor: Editor, doc: Document) {
    this.editor = editor
    this.doc = doc
    this.initToolbarDom()
  }

  private initToolbarDom() {
  }
}
