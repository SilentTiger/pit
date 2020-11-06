import Delta from 'quill-delta-enhanced'
import Document from '../src/scripts/DocStructure/Document'
import Paragraph from '../src/scripts/DocStructure/Paragraph'
import QuoteBlock from '../src/scripts/DocStructure/QuoteBlock'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import { LayoutFrameDefaultAttributes } from '../src/scripts/DocStructure/LayoutFrameAttributes'
import { getPlatform } from '../src/scripts/Platform'
import ListItem from '../src/scripts/DocStructure/ListItem'

describe('read', () => {
  test('read simple paragraph', () => {
    const delta = new Delta()
    delta.insert('0123456789', { color: '#000' })
    delta.insert(1, { frag: 'end', block: 'para' })
    delta.insert('abcdefghij')
    delta.insert(1, { frag: 'end', block: 'para', linespacing: 2, title: 0 })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(2)
    expect(((doc.children[1] as Paragraph).children[0].children[0] as FragmentText).attributes.size).toBe(20)
  })

  test('read quoteblock', () => {
    const delta = new Delta()
    delta.insert('quote block content')
    delta.insert(1, { frag: 'end', block: 'quote' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children[0] instanceof QuoteBlock).toBe(true)
  })
})

describe('insertText', () => {
  test('insertText at wrong place', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)

    const oldContent = doc.toHtml()
    const change1 = doc.insertText('abcdefg', { index: 3, inner: null }, false)
    const newContent = doc.toHtml()
    expect(change1.ops.length).toBe(0)
    expect(oldContent).toBe(newContent)
  })

  test('simple insert text', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert(1, { frag: 'end', block: 'para' })
    delta.insert('B')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    expect(doc.children.length).toBe(2)
    expect(doc.children[1].needLayout).toBe(false)

    const change1 = doc.insertText('abcdefg', { index: 3, inner: null }, false)
    expect(doc.children[1].toText()).toBe('Babcdefg\n')
    expect((doc.children[1] as Paragraph).children[0].children.length).toBe(2)
    expect(change1.ops).toEqual([{ retain: 3 }, { insert: 'abcdefg', attributes: {} }])
    expect(doc.children[1].start).toBe(2)
    expect(doc.children[1].needLayout).toBe(true)

    doc.layout()

    expect(doc.children[0].needLayout).toBe(false)
    const change2 = doc.insertText('1234567', { index: 1, inner: null }, false)
    expect(doc.children[0].toText()).toBe('A1234567\n')
    expect((doc.children[0] as Paragraph).children[0].children.length).toBe(2)
    expect(change2.ops).toEqual([{ retain: 1 }, { insert: '1234567', attributes: {} }])
    expect(doc.children[1].start).toBe(9)
    expect(doc.children[0].needLayout).toBe(true)
    expect(doc.children[1].needLayout).toBe(false)
  })

  test('insertText with attributes', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)

    doc.layout()
    expect(doc.contentHeight).toBe(Math.ceil(getPlatform().convertPt2Px[11] * LayoutFrameDefaultAttributes.linespacing))

    doc.insertText('BIG TEXT', { index: 1, inner: null }, false, { size: 21 })
    doc.layout()
    expect((doc.children[0] as Paragraph).children[0].lines.length).toBe(2)
    expect((doc.children[0] as Paragraph).children[0].lines[1].y).toBe(Math.floor(getPlatform().convertPt2Px[21] * LayoutFrameDefaultAttributes.linespacing))
    expect((doc.children[0] as Paragraph).children[0].lines[1].height).toBe(getPlatform().convertPt2Px[21] * LayoutFrameDefaultAttributes.linespacing)
    const docHeight = (doc.children[0] as Paragraph).children[0].lines[1].y + (doc.children[0] as Paragraph).children[0].lines[1].height
    expect(doc.contentHeight).toBe(Math.ceil(docHeight))

    doc.insertText('', { index: 4, inner: null }, false, { size: 21 })
    expect((doc.children[0] as Paragraph).children[0].children.length).toBe(3)

    doc.insertText('big ', { index: 1, inner: null }, false, { size: 21 })
    expect((doc.children[0] as Paragraph).children[0].children.length).toBe(3)

    doc.insertText('more bigger ', { index: 1, inner: null }, false, { size: 26 })
    expect((doc.children[0] as Paragraph).children[0].children.length).toBe(4)

    doc.insertText(' IN', { index: 5, inner: null }, false, { size: 21 })
    expect((doc.children[0] as Paragraph).children[0].children.length).toBe(6)

    doc.insertText(' IN', { index: 7, inner: null }, false, { size: 21 })
    expect((doc.children[0] as Paragraph).children[0].children.length).toBe(6)
  })

  test('insertText with no attributes', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert('B', { size: 21 })
    delta.insert(1, { gallery: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail', frag: 'img', layout: 'embed', margin: 10 })
    delta.insert('CD')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)

    doc.insertText('beforeC ', { index: 3, inner: null }, false)
    expect((doc.children[0] as Paragraph).children[0].children[3].toText()).toBe('beforeC CD')

    doc.insertText(' in CD ', { index: 12, inner: null }, false)
    expect((doc.children[0] as Paragraph).children[0].children[3].toText()).toBe('beforeC C in CD D')

    doc.insertText('before ', { index: 0, inner: null }, false)
    expect((doc.children[0] as Paragraph).children[0].children[0].toText()).toBe('before A')

    doc.insertText(' after ', { index: 8, inner: null }, false)
    expect((doc.children[0] as Paragraph).children[0].children[0].toText()).toBe('before A after ')
  })

  test('insertText in front of image', () => {
    const delta = new Delta()
    delta.insert(1, { gallery: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail', frag: 'img', layout: 'embed', margin: 'none' })
    delta.insert(1, { gallery: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail', frag: 'img', layout: 'embed', margin: 10 })
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)

    doc.insertText('between images', { index: 1, inner: null }, false)
    expect((doc.children[0] as Paragraph).children[0].children[1].toText()).toBe('between images')

    doc.insertText('before images', { index: 0, inner: null }, false)
    expect((doc.children[0] as Paragraph).children[0].children[0].toText()).toBe('before images')
  })
})

describe('insertEnter', () => {
  test('insertEnter before Paragraph', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert(1, { frag: 'end', block: 'para', linespacing: 2 })
    const doc = new Document()
    doc.readFromChanges(delta)

    doc.insertEnter({ index: 0, inner: null })
    expect(doc.children.length).toBe(2)
    expect(doc.children[0] instanceof Paragraph).toBe(true)
    expect((doc.children[0] as Paragraph).children[0].attributes.linespacing).toBe(2)
    expect((doc.children[0] as Paragraph).toText()).toBe('\n')
    expect((doc.children[1] as Paragraph).children[0].attributes.linespacing).toBe(2)
    expect((doc.children[1] as Paragraph).toText()).toBe('A\n')
  })

  test('insertEnter between paragraphs', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert(1, { frag: 'end', block: 'para', linespacing: 2 })
    delta.insert('B')
    delta.insert(1, { frag: 'end', block: 'para', linespacing: 3 })
    const doc = new Document()
    doc.readFromChanges(delta)

    const diff = doc.insertEnter({ index: 2, inner: null })
    expect(doc.children.length).toBe(3)
    expect((doc.children[0] as Paragraph).children[0].attributes.linespacing).toBe(2)
    expect((doc.children[1] as Paragraph).children[0].attributes.linespacing).toBe(3)
    expect((doc.children[2] as Paragraph).children[0].attributes.linespacing).toBe(3)
    expect(diff?.ops).toEqual([
      { retain: 2 },
      { insert: 1, attributes: { frag: 'end', block: 'para', linespacing: 3 } },
    ])
  })

  test('insertEnter at the end of paragraph', () => {
    const delta = new Delta()
    delta.insert('A')
    delta.insert(1, { frag: 'end', block: 'para', linespacing: 2 })
    delta.insert('B')
    delta.insert(1, { frag: 'end', block: 'para', linespacing: 3 })
    const doc = new Document()
    doc.readFromChanges(delta)

    doc.insertEnter({ index: 1, inner: null })
    expect(doc.children.length).toBe(3)
    expect((doc.children[0] as Paragraph).children[0].attributes.linespacing).toBe(2)
    expect((doc.children[1] as Paragraph).children[0].attributes.linespacing).toBe(2)
    expect((doc.children[2] as Paragraph).children[0].attributes.linespacing).toBe(3)
  })

  test('insertEnter in quoteblock', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', linespacing: 2 })
    delta.insert('second line')
    delta.insert(1, { frag: 'end', block: 'quote', linespacing: 3 })
    const doc = new Document()
    doc.readFromChanges(delta)

    expect(doc.children.length).toBe(1)
    doc.insertEnter({ index: 5, inner: null })
    expect(doc.children.length).toBe(1)

    const frames = (doc.children[0] as QuoteBlock).children
    expect(frames[0].attributes.linespacing).toBe(2)
    expect(frames[1].attributes.linespacing).toBe(2)
    expect(frames[2].attributes.linespacing).toBe(3)
    expect(frames[0].toText()).toBe('first\n')
    expect(frames[1].toText()).toBe(' line\n')
  })

  test('insertEnter before quoteblock', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', linespacing: 2 })
    delta.insert('second line')
    delta.insert(1, { frag: 'end', block: 'quote', linespacing: 3 })
    const doc = new Document()
    doc.readFromChanges(delta)

    expect(doc.children.length).toBe(1)
    doc.insertEnter({ index: 0, inner: null })
    expect(doc.children.length).toBe(1)

    const frames = (doc.children[0] as QuoteBlock).children
    expect(frames[0].attributes.linespacing).toBe(2)
    expect(frames[1].attributes.linespacing).toBe(2)
    expect(frames[2].attributes.linespacing).toBe(3)
    expect(frames[0].toText()).toBe('\n')
    expect(frames[1].toText()).toBe('first line\n')
  })

  test('insertEnter at the end of quoteblock', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', linespacing: 2 })
    delta.insert('second line')
    delta.insert(1, { frag: 'end', block: 'quote', linespacing: 3 })
    const doc = new Document()
    doc.readFromChanges(delta)

    expect(doc.children.length).toBe(1)
    const diff = doc.insertEnter({ index: 22, inner: null })
    expect(doc.children.length).toBe(1)

    const frames = (doc.children[0] as QuoteBlock).children
    expect(frames[0].attributes.linespacing).toBe(2)
    expect(frames[1].attributes.linespacing).toBe(3)
    expect(frames[2].attributes.linespacing).toBe(3)
    expect(frames[0].toText()).toBe('first line\n')
    expect(frames[1].toText()).toBe('second line\n')
    expect(frames[2].toText()).toBe('\n')
    expect(diff?.ops).toEqual([
      { retain: 22 },
      { retain: 1, attributes: { block: null } },
      { insert: 1, attributes: { frag: 'end', block: 'quote', linespacing: 3 } },
    ])
  })

  test('insertEnter in ListItem', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', block: 'list', linespacing: 2, 'list-id': 'randomId' })
    delta.insert('second line')
    delta.insert(1, { frag: 'end', block: 'list', linespacing: 3, 'list-id': 'randomId' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    expect(doc.children.length).toBe(2)
    expect((doc.children[1] as ListItem).titleIndex).toBe(1)
    const diff1 = doc.insertEnter({ index: 17, inner: null })
    doc.layout()
    expect(doc.children.length).toBe(3)
    expect((doc.children[1] as ListItem).attributes.listId).toBe('randomId')
    expect((doc.children[2] as ListItem).attributes.listId).toBe('randomId')
    expect((doc.children[2] as ListItem).titleIndex).toBe(2)
    expect(diff1?.ops).toEqual([
      { retain: 17 },
      { insert: 1, attributes: { frag: 'end', block: 'list', linespacing: 3, 'list-id': 'randomId', 'list-type': 'decimal' } },
    ])
  })

  test('insertEnter before ListItem', () => {
    const delta = new Delta()
    delta.insert('first line')
    delta.insert(1, { frag: 'end', block: 'list', linespacing: 2, 'list-id': 'randomId' })
    delta.insert('second line')
    delta.insert(1, { frag: 'end', block: 'list', linespacing: 3, 'list-id': 'randomId', color: 'red', size: 21 })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    expect(doc.children.length).toBe(2)
    expect((doc.children[1] as ListItem).titleIndex).toBe(1)
    const diff1 = doc.insertEnter({ index: 17, inner: null })
    doc.layout()
    expect(doc.children.length).toBe(3)
    expect((doc.children[1] as ListItem).attributes.listId).toBe('randomId')
    expect((doc.children[2] as ListItem).attributes.listId).toBe('randomId')
    expect((doc.children[2] as ListItem).titleIndex).toBe(2)
    expect(diff1?.ops).toEqual([
      { retain: 17 },
      { insert: 1, attributes: { frag: 'end', block: 'list', linespacing: 3, 'list-id': 'randomId', 'list-type': 'decimal', color: 'red', size: 21 } },
    ])
  })
})

describe('delete single range', () => {
  test('delete in paragraph in fragment', () => {
    const delta = new Delta()
    delta.insert('hello world')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    doc.delete([{ start: { index: 5, inner: null }, end: { index: 6, inner: null } }])
    const targetParagraph = doc.children[0] as Paragraph
    expect(targetParagraph.needLayout).toBe(true)
    expect(targetParagraph.toText()).toBe('helloworld\n')
  })

  test('delete in paragraph across 2 fragments', () => {
    const delta = new Delta()
    delta.insert('hello', { color: 'red' })
    delta.insert('world', { color: 'green' })
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    doc.delete([{ start: { index: 4, inner: null }, end: { index: 6, inner: null } }])
    const targetParagraph = doc.children[0] as Paragraph
    expect(targetParagraph.needLayout).toBe(true)
    expect(targetParagraph.toText()).toBe('hellorld\n')
  })

  test('delete in paragraph across 3 fragments', () => {
    const delta = new Delta()
    delta.insert('hello', { color: 'red' })
    delta.insert(' ')
    delta.insert('world', { color: 'green' })
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    const diff = doc.delete([{ start: { index: 4, inner: null }, end: { index: 7, inner: null } }])
    const targetParagraph = doc.children[0] as Paragraph
    expect(targetParagraph.needLayout).toBe(true)
    expect(targetParagraph.toText()).toBe('hellorld\n')
    expect(diff?.ops).toEqual([
      { retain: 4 },
      { retain: 1, attributes: { color: 'green' } },
      { delete: 3 },
    ])
  })

  test('delete in paragraph across 3 fragments with merge', () => {
    const delta = new Delta()
    delta.insert('hello', { color: 'red' })
    delta.insert(' ')
    delta.insert('world', { color: 'red' })
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()

    const diff = doc.delete([{ start: { index: 4, inner: null }, end: { index: 7, inner: null } }])
    const targetParagraph = doc.children[0] as Paragraph
    expect(targetParagraph.needLayout).toBe(true)
    expect(targetParagraph.toText()).toBe('hellorld\n')
    const targetFrame = targetParagraph.children[0]
    expect(targetFrame.children.length).toBe(2)
    expect(targetFrame.children[0].start).toBe(0)
    expect(targetFrame.children[1].start).toBe(8)

    expect(diff?.ops).toEqual([
      { retain: 5 },
      { delete: 3 },
    ])
  })
})
