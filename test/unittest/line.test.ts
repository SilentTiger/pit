import Delta from 'quill-delta-enhanced'
import type Line from '../../src/scripts/RenderStructure/Line'
import Document from '../../src/scripts/Document/Document'
import type BlockCommon from '../../src/scripts/Block/BlockCommon'

describe('run factory', () => {
  test('layout', () => {
    const delta = new Delta()
    delta.insert('background', { background: 'red' })
    delta.insert('underline', { underline: true })
    delta.insert('strike', { strike: true })
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.setWidth(480)
    doc.readFromChanges(delta)
    doc.layout()
    const line1: any = (doc.head as BlockCommon)?.head?.lines[0] as Line
    expect(line1.backgroundList.length).toBe(1)
  })
})
