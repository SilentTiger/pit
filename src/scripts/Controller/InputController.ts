import FragmentImage from '../Fragment/FragmentImage'
import type Editor from '../Editor'
import type ContentService from '../Service/ContentService'
import Controller from './Controller'
import type Document from '../Document/Document'

export default class ContentController extends Controller {
  private service: ContentService
  constructor(editor: Editor, doc: Document, service: ContentService) {
    super(editor, doc)
    this.service = service
  }

  public insertImage(url: string) {
    const imageFrag = new FragmentImage()
    imageFrag.setAttributes({
      width: 300,
      height: 300,
      src: url,
      oriWidth: 300,
      oriHeight: 300,
    })
    this.service.insertFragment(imageFrag)
  }
}
