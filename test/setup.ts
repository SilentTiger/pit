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
import { initPlatform } from '../src/scripts/Platform'
import platform from './Platform.nodetest'

StructureRegistrar.registerBlock(Paragraph.blockType, Paragraph)
StructureRegistrar.registerBlock(ListItem.blockType, ListItem)
StructureRegistrar.registerBlock(QuoteBlock.blockType, QuoteBlock)
StructureRegistrar.registerBlock(Table.blockType, Table)
StructureRegistrar.registerBlock(CodeBlock.blockType, CodeBlock)

StructureRegistrar.registerFragment(FragmentText.fragType, FragmentText)
StructureRegistrar.registerFragment(FragmentParaEnd.fragType, FragmentParaEnd)
StructureRegistrar.registerFragment(FragmentDate.fragType, FragmentDate)
StructureRegistrar.registerFragment(FragmentImage.fragType, FragmentImage)

initPlatform(platform)
