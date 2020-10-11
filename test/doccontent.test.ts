import Delta from 'quill-delta-enhanced'
import Document from '../src/scripts/DocStructure/Document'
import CodeBlock from '../src/scripts/DocStructure/CodeBlock'
import FragmentDate from '../src/scripts/DocStructure/FragmentDate'
import FragmentImage from '../src/scripts/DocStructure/FragmentImage'
import FragmentParaEnd from '../src/scripts/DocStructure/FragmentParaEnd'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import ListItem from '../src/scripts/DocStructure/ListItem'
import Paragraph from '../src/scripts/DocStructure/Paragraph'
import QuoteBlock from '../src/scripts/DocStructure/QuoteBlock'
import Table from '../src/scripts/DocStructure/Table'
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

test('read simple data', () => {
  const delta = new Delta()
  delta.insert('0123456789')
  delta.insert(1, { frag: 'end', block: 'para' })
  const doc = new Document()
  doc.readFromChanges(delta)
  expect(doc.children.length).toBe(1)
})
