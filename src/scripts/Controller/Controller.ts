import Editor from "../Editor";
import Document from '../DocStructure/Document';

export default class Controller {
  protected editor: Editor;
  protected doc: Document;
  constructor(editor: Editor, doc: Document) {
    this.editor = editor;
    this.doc = doc;
  }
}