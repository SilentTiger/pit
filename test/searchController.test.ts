import Delta from 'quill-delta-enhanced'
import SearchService from '../src/scripts/Service/SearchService'
import Document from '../src/scripts/Document/Document'
import defaultEditorConfig from '../src/scripts/IEditorConfig'
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
    doc.setWidth(defaultEditorConfig.canvasWidth)
    doc.readFromChanges(delta)
    doc.layout()

    const sc = new SearchService(doc)
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

    const sc = new SearchService(doc)
    sc.search('xx')
    expect(sc.getSearchResult()).toEqual([])
    expect(sc.searchResultCurrentIndex).toBe(undefined)
  })

  test('search and replace', () => {
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

    const sc = new SearchService(doc)
    sc.search('line')
    expect(sc.getSearchResult().length).toBe(3)
    expect(sc.searchResultCurrentIndex).toBe(0)
    sc.replace('xyz')
    sc.search('line')
    expect(sc.getSearchResult().length).toBe(2)
    expect(sc.searchResultCurrentIndex).toBe(0)
    expect(doc.toDelta().ops).toEqual([
      { insert: 'first xyz' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
      { insert: 'second line' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
      { insert: 'third line' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
    ])

    sc.replace('opq', true)
    sc.search('line')
    expect(sc.getSearchResult().length).toBe(0)
    expect(sc.searchResultCurrentIndex).toBe(undefined)
    expect(doc.toDelta().ops).toEqual([
      { insert: 'first xyz' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
      { insert: 'second opq' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
      { insert: 'third opq' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
    ])
  })

  test('search and replace', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', block: 'para' })
    delta.insert('second line width sub line content')
    delta.insert(1, { frag: 'end', block: 'para' })
    delta.insert('third line')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)

    const sc = new SearchService(doc)
    sc.search('line')

    expect(sc.getSearchResult().length).toBe(4)
    expect(sc.searchResultCurrentIndex).toBe(0)
    sc.replace('x', true)
    expect(doc.toDelta().ops).toEqual([
      { insert: 'first x' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
      { insert: 'second x width sub x content' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
      { insert: 'third x' },
      { insert: 1, attributes: { frag: 'end', block: 'para' } },
    ])
  })
})
