import type Document from '../DocStructure/Document'
import EventEmitter from 'eventemitter3'

export default class Service extends EventEmitter {
  protected doc: Document
  constructor(doc: Document) {
    super()
    this.doc = doc
  }
}
