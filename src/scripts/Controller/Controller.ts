import type Editor from '../Editor'
import type Document from '../Document/Document'

export default class Controller {
  protected editor: Editor
  protected doc: Document
  constructor(editor: Editor, doc: Document) {
    this.editor = editor
    this.doc = doc
  }
}
