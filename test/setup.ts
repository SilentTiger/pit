import CodeBlock from '../src/scripts/Block/CodeBlock'
import FragmentDate from '../src/scripts/Fragment/FragmentDate'
import FragmentImage from '../src/scripts/Fragment/FragmentImage'
import FragmentParaEnd from '../src/scripts/Fragment/FragmentParaEnd'
import FragmentText from '../src/scripts/Fragment/FragmentText'
import ListItem from '../src/scripts/Block/ListItem'
import Paragraph from '../src/scripts/Block/Paragraph'
import QuoteBlock from '../src/scripts/Block/QuoteBlock'
import Table from '../src/scripts/Block/Table'
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
