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

bind(Paragraph.blockType, Paragraph)
bind(ListItem.blockType, ListItem)
bind(QuoteBlock.blockType, QuoteBlock)
bind(Table.blockType, Table)
bind(CodeBlock.blockType, CodeBlock)

bind(FragmentText.fragType, FragmentText)
bind(FragmentParaEnd.fragType, FragmentParaEnd)
bind(FragmentDate.fragType, FragmentDate)
bind(FragmentImage.fragType, FragmentImage)

initPlatform(platform)
