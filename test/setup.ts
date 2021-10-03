import CodeBlock from '../src/scripts/Block/CodeBlock'
import FragmentDate from '../src/scripts/Fragment/FragmentDate'
import FragmentImage from '../src/scripts/Fragment/FragmentImage'
import FragmentParaEnd from '../src/scripts/Fragment/FragmentParaEnd'
import FragmentText from '../src/scripts/Fragment/FragmentText'
import ListItem from '../src/scripts/Block/ListItem'
import Paragraph from '../src/scripts/Block/Paragraph'
import QuoteBlock from '../src/scripts/Block/QuoteBlock'
import Table from '../src/scripts/Block/Table'
import { bind } from '../src/scripts/Common/IoC'
import { initPlatform } from '../src/scripts/Platform'
import platform from './Platform.nodetest'
import LayoutFrame from '../src/scripts/RenderStructure/LayoutFrame'

bind(Paragraph.typeName, Paragraph)
bind(ListItem.typeName, ListItem)
bind(QuoteBlock.typeName, QuoteBlock)
bind(Table.typeName, Table)
bind(CodeBlock.typeName, CodeBlock)

bind(FragmentText.typeName, FragmentText)
bind(FragmentParaEnd.typeName, FragmentParaEnd)
bind(FragmentDate.typeName, FragmentDate)
bind(FragmentImage.typeName, FragmentImage)

bind(LayoutFrame.typeName, LayoutFrame)

initPlatform(platform)
