import Delta from 'quill-delta-enhanced'
import { getPlatform } from '../src/scripts/Platform'
import { LayoutFrameDefaultAttributes } from '../src/scripts/RenderStructure/LayoutFrameAttributes'
import Paragraph from '../src/scripts/DocStructure/Paragraph'
import type RunText from '../src/scripts/RenderStructure/RunText'

describe('read paragraph', () => {
  test('simple paragraph', () => {
    const d1 = new Delta()
    d1.insert('paragraph 1')
    d1.insert(1, { frag: 'end', block: 'para' })
    const p1 = new Paragraph()
    p1.readFromOps(d1.ops)
    p1.setWidth(500)
    p1.layout()
    expect(p1.height).toBe(getPlatform().convertPt2Px[11] * LayoutFrameDefaultAttributes.linespacing)
  })

  test('paragraph getDocumentPos', () => {
    const d1 = new Delta()
    d1.insert('paragraph 1')
    d1.insert(1, { frag: 'end', block: 'para' })
    const p1 = new Paragraph()
    p1.readFromOps(d1.ops)
    p1.setWidth(400)
    p1.layout()
    expect(p1.getDocumentPos(-1, -1, true)).toEqual({ index: 0, inner: null })
    expect(p1.getDocumentPos(0, 0, true)).toEqual({ index: 0, inner: null })
    expect(p1.getDocumentPos(400, 0, true)).toEqual({ index: 10, inner: null })
    expect(
      p1.getDocumentPos(400, getPlatform().convertPt2Px[11] * LayoutFrameDefaultAttributes.linespacing + 1, true),
    ).toEqual({ index: 11, inner: null })
    expect((p1.children[0].lines[1].children[0] as RunText).content).toEqual('1')
  })

  test('paragraph insertEnter', () => {
    const d1 = new Delta()
    d1.insert('paragraph 1')
    d1.insert(1, { frag: 'end', block: 'para' })
    const p1 = new Paragraph()
    p1.readFromOps(d1.ops)

    const newParagraph = p1.insertEnter({ index: 0, inner: null })
    expect(newParagraph?.toText()).toBe('paragraph 1\n')
    expect(p1.toText()).toBe('\n')
  })
})
