import Delta from 'quill-delta-enhanced'
import RunText from '../../src/scripts/RenderStructure/RunText'
import FragmentText from '../../src/scripts/DocStructure/FragmentText'
import { getPlatform } from '../../src/scripts/Platform'
import { EnumCursorType } from '../../src/scripts/Common/EnumCursorType'
import FragmentParaEnd from '../../src/scripts/DocStructure/FragmentParaEnd'
import RunParaEnd from '../../src/scripts/RenderStructure/RunParaEnd'
import FragmentDate from '../../src/scripts/DocStructure/FragmentDate'
import RunDate from '../../src/scripts/RenderStructure/RunDate'
import RunImage from '../../src/scripts/RenderStructure/RunImage'
import FragmentImage from '../../src/scripts/DocStructure/FragmentImage'
import { createRun } from '../../src/scripts/RenderStructure/runFactory'
import Fragment from '../../src/scripts/DocStructure/Fragment'
import type Line from '../../src/scripts/RenderStructure/Line'
import Paragraph from '../../src/scripts/DocStructure/Paragraph'
import LayoutFrame from '../../src/scripts/DocStructure/LayoutFrame'
import Document from '../../src/scripts/DocStructure/Document'
import type BlockCommon from '../../src/scripts/DocStructure/BlockCommon'

describe('run factory', () => {
  test('layout', () => {
    const delta = new Delta()
    delta.insert('normal')
    delta.insert('background', { background: 'red' })
    delta.insert('underline', { underline: true })
    delta.insert('strike', { strike: true })
    delta.insert('normal')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.setWidth(8000)
    doc.readFromChanges(delta)
    doc.layout()
    expect((doc.head as BlockCommon)?.head?.lines.length).toBe(1)
    const targetLine: any = (doc.head as BlockCommon)?.head?.lines[0] as Line
    expect(targetLine.backgroundList.length).toBe(1)
    expect(targetLine.underlineList.length).toBe(1)
    expect(targetLine.strikeList.length).toBe(1)
  })
})
