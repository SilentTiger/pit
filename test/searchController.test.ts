import Delta from 'quill-delta-enhanced'
import SearchController from '../src/scripts/Controller/SearchController'
import Document from '../src/scripts/DocStructure/Document'
import Paragraph from '../src/scripts/DocStructure/Paragraph'

describe('search', () => {
  test('simple search', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', block: 'para' })
    delta.insert('second line')
    delta.insert(1, { frag: 'end', block: 'para' })
    delta.insert('third line')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    const sc = new SearchController(doc)
    expect(sc.nextSearchResult()).toBe(null)
    expect(sc.prevSearchResult()).toBe(null)

    const res = sc.search('line')
    expect(res).toEqual([
      { pos: { index: 6, inner: null }, rects: [{ x: 240, y: 0, width: 160, height: 14 * 1.7 }] },
      { pos: { index: 18, inner: null }, rects: [{ x: 280, y: 23, width: 160, height: 14 * 1.7 }] },
      { pos: { index: 29, inner: null }, rects: [{ x: 240, y: 46, width: 160, height: 14 * 1.7 }] },
    ])
    expect(res).toEqual(sc.getSearchResult())
    expect(sc.searchResultCurrentIndex).toBe(0)
    expect(sc.nextSearchResult()).toEqual({ index: 1, res: res[1] })
    expect(sc.nextSearchResult()).toEqual({ index: 2, res: res[2] })
    expect(sc.nextSearchResult()).toEqual({ index: 0, res: res[0] })
    expect(sc.prevSearchResult()).toEqual({ index: 2, res: res[2] })
    expect(sc.prevSearchResult()).toEqual({ index: 1, res: res[1] })

    sc.clearSearch()
    expect(sc.searchResultCurrentIndex).toBe(undefined)
    expect(sc.getSearchResult()).toEqual([])
  })

  test('search no result', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    const sc = new SearchController(doc)
    sc.search('xx')
    expect(sc.getSearchResult()).toEqual([])
  })
})
