import CodeBlock from '../src/scripts/Block/CodeBlock'
import FragmentDate from '../src/scripts/Fragment/FragmentDate'
import FragmentImage from '../src/scripts/Fragment/FragmentImage'
import FragmentParaEnd from '../src/scripts/Fragment/FragmentParaEnd'
import FragmentText from '../src/scripts/Fragment/FragmentText'
import ListItem from '../src/scripts/Block/ListItem'
import Paragraph from '../src/scripts/Block/Paragraph'
import QuoteBlock from '../src/scripts/Block/QuoteBlock'
import Table from '../src/scripts/Block/Table'
import { bind, mapRunToFragment } from '../src/scripts/Common/IoC'
import { initPlatform } from '../src/scripts/Platform'
import platform from './Platform.nodetest'
import LayoutFrame from '../src/scripts/RenderStructure/LayoutFrame'
import RunText from '../src/scripts/RenderStructure/RunText'
import RunParaEnd from '../src/scripts/RenderStructure/RunParaEnd'
import RunDate from '../src/scripts/RenderStructure/RunDate'
import RunImage from '../src/scripts/RenderStructure/RunImage'

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

bind(RunText.typeName, RunText)
bind(RunParaEnd.typeName, RunParaEnd)
bind(RunDate.typeName, RunDate)
bind(RunImage.typeName, RunImage)

mapRunToFragment(FragmentText.typeName, RunText.typeName)
mapRunToFragment(FragmentParaEnd.typeName, RunParaEnd.typeName)
mapRunToFragment(FragmentDate.typeName, RunDate.typeName)
mapRunToFragment(FragmentImage.typeName, RunImage.typeName)

initPlatform(platform)
