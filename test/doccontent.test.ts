import Delta from 'quill-delta-enhanced'
import Document from '../src/scripts/DocStructure/Document'
import CodeBlock from '../src/scripts/DocStructure/CodeBlock'
import ListItem from '../src/scripts/DocStructure/ListItem'
import Paragraph from '../src/scripts/DocStructure/Paragraph'
import QuoteBlock from '../src/scripts/DocStructure/QuoteBlock'
import Table from '../src/scripts/DocStructure/Table'
import FragmentDate from '../src/scripts/DocStructure/FragmentDate'
import FragmentImage from '../src/scripts/DocStructure/FragmentImage'
import FragmentParaEnd from '../src/scripts/DocStructure/FragmentParaEnd'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import StructureRegistrar from '../src/scripts/StructureRegistrar'

beforeAll(() => {
  // 在 StructureRegistrar 中注册 各种 Block
  StructureRegistrar.registerBlock(Paragraph.blockType, Paragraph)
  StructureRegistrar.registerBlock(ListItem.blockType, ListItem)
  StructureRegistrar.registerBlock(QuoteBlock.blockType, QuoteBlock)
  StructureRegistrar.registerBlock(Table.blockType, Table)
  StructureRegistrar.registerBlock(CodeBlock.blockType, CodeBlock)

  StructureRegistrar.registerFragment(FragmentText.fragType, FragmentText)
  StructureRegistrar.registerFragment(FragmentParaEnd.fragType, FragmentParaEnd)
  StructureRegistrar.registerFragment(FragmentDate.fragType, FragmentDate)
  StructureRegistrar.registerFragment(FragmentImage.fragType, FragmentImage)
})

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

test('simple insert text', () => {
  const delta = new Delta()
  delta.insert('')
  delta.insert(1, { frag: 'end', block: 'para' })
  const doc = new Document()
  doc.readFromChanges(delta)
  doc.insertText('abcdefg', { index: 0, inner: null }, false)
  expect(doc.children[0].toText()).toBe('abcdefg\n')
  expect((doc.children[0] as Paragraph).children[0].children.length).toBe(2)
  doc.insertText('123', { index: 1, inner: null }, false)
  expect(doc.children[0].toText()).toBe('a123bcdefg\n')
  expect((doc.children[0] as Paragraph).children[0].children.length).toBe(2)
  doc.insertText('xyz', { index: 10, inner: null }, false)
  expect(doc.children[0].toText()).toBe('a123bcdefgxyz\n')
  expect((doc.children[0] as Paragraph).children[0].children.length).toBe(2)
})
