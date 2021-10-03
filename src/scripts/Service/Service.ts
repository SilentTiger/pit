import type Document from '../Document/Document'
import EventEmitter from 'eventemitter3'

export default abstract class Service extends EventEmitter {
  protected doc: Document
  constructor(doc: Document) {
    super()
    this.doc = doc
  }
}
