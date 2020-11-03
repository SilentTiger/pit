import Delta from 'quill-delta-enhanced'
import Document from '../src/scripts/DocStructure/Document'
import Paragraph from '../src/scripts/DocStructure/Paragraph'
import QuoteBlock from '../src/scripts/DocStructure/QuoteBlock'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import { LayoutFrameDefaultAttributes } from '../src/scripts/DocStructure/LayoutFrameAttributes'
import { getPlatform } from '../src/scripts/Platform'

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
