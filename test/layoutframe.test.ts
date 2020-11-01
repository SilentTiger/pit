import Delta from 'quill-delta-enhanced'
import platform from './Platform.nodetest'
import { getPlatform, initPlatform } from '../src/scripts/Platform'
import StructureRegistrar from '../src/scripts/StructureRegistrar'
import LayoutFrame from '../src/scripts/DocStructure/LayoutFrame'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import FragmentParaEnd from '../src/scripts/DocStructure/FragmentParaEnd'
import FragmentImage from '../src/scripts/DocStructure/FragmentImage'
import FragmentDate from '../src/scripts/DocStructure/FragmentDate'
import RunParaEnd from '../src/scripts/RenderStructure/RunParaEnd'
import MockCanvasContext from './MockCanvas'
import { FragmentTextDefaultAttributes } from '../src/scripts/DocStructure/FragmentTextAttributes'

const mockCtx = new MockCanvasContext(document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D)
beforeAll(() => {
  initPlatform(platform)

  StructureRegistrar.registerFragment(FragmentText.fragType, FragmentText)
  StructureRegistrar.registerFragment(FragmentParaEnd.fragType, FragmentParaEnd)
  StructureRegistrar.registerFragment(FragmentDate.fragType, FragmentDate)
  StructureRegistrar.registerFragment(FragmentImage.fragType, FragmentImage)
})

describe('layout frame simple read', () => {
  test('unknown fragment', () => {
    const delta1 = new Delta()
    delta1.insert('red text content', { color: 'red', frag: 'unknown' })
    delta1.insert(1, { frag: 'end' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    expect(f1.children.length).toBe(1)
    expect(f1.head instanceof FragmentParaEnd).toBe(true)
  })

  test('simple layout frame', () => {
    const delta1 = new Delta()
    delta1.insert('red text', { color: 'red' })
    delta1.insert('blur text', { color: 'blur' })
    delta1.insert(1, { frag: 'end' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    expect(f1.children.length).toBe(3)
  })
})

describe('layout frame layout', () => {
  test('simple layout', () => {
    const delta1 = new Delta()
    delta1.insert('red text', { color: 'red' })
    delta1.insert('blue text', { color: 'blue' })
    delta1.insert(1, { frag: 'end' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(680)
    f1.layout()
    expect(f1.lines.length).toBe(1)

    f1.setMaxWidth(160)
    f1.layout()
    expect(f1.lines.length).toBe(4)
    expect(f1.lines.map(l => l.children.length)).toEqual([2, 1, 2, 2])
  })

  test('empty layout frame', () => {
    const delta1 = new Delta()
    delta1.insert(1, { frag: 'end' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(680)
    f1.layout()
    expect(f1.lines.length).toBe(1)
    expect(f1.lines[0].children[0] instanceof RunParaEnd).toBe(true)
  })

  test('layout frame with some spaces', () => {
    const delta1 = new Delta()
    delta1.insert('    ')
    delta1.insert(1, { frag: 'end' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(160)
    f1.layout()
    expect(f1.lines.length).toBe(1)
  })

  test('layout frame with alignment center', () => {
    const delta1 = new Delta()
    delta1.insert('12345 67890 abcde fghij')
    delta1.insert(1, { frag: 'end', align: 'center' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(500)
    f1.layout()
    expect(f1.lines.length).toBe(2)
    expect(f1.lines[0].children[0].x).toBe(30)
  })

  test('layout frame with alignment right', () => {
    const delta1 = new Delta()
    delta1.insert('12345 67890 abcde fghij')
    delta1.insert(1, { frag: 'end', align: 'right' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(500)
    f1.layout()
    expect(f1.lines.length).toBe(2)
    expect(f1.lines[0].children[0].x).toBe(60)
  })

  test('layout frame with alignment justify', () => {
    const delta1 = new Delta()
    delta1.insert('12345 67890 abcde fghij')
    delta1.insert(1, { frag: 'end', align: 'justify' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(500)
    f1.layout()
    expect(f1.lines.length).toBe(2)
    expect(f1.lines[0].children.length).toBe(4)
    expect(f1.lines[0].children[0].x).toBe(0)
    expect(f1.lines[0].children[2].x).toBe(300)
    expect(f1.lines[1].children[0].x).toBe(0)
    expect(f1.lines[1].children[2].x).toBe(240)
  })

  test('layout frame with alignment scattered', () => {
    const delta1 = new Delta()
    delta1.insert('12345 67890 abcde fghij')
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(500)
    f1.layout()
    expect(f1.lines.length).toBe(2)
    expect(f1.lines[0].children.length).toBe(4)
    expect(f1.lines[0].children[0].x).toBe(0)
    expect(f1.lines[0].children[2].x).toBe(300)
    expect(f1.lines[1].children[0].x).toBe(0)
    expect(f1.lines[1].children[2].x).toBe(300)
  })

  test('layout frame layout split piece', () => {
    const delta1 = new Delta()
    delta1.insert('today')
    delta1.insert(1, { frag: 'end' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(100)
    f1.layout()
    expect(f1.lines.length).toBe(3)

    const delta2 = new Delta()
    delta2.insert(1, { gallery: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail', frag: 'img', layout: 'embed', margin: 'none', width: 200, height: 50 })
    delta2.insert('today', { color: 'green' })
    delta2.insert(1, { frag: 'end' })
    const f2 = new LayoutFrame()
    f2.readFromOps(delta2.ops)

    f2.setMaxWidth(100)
    f2.layout()
    expect(f2.lines.length).toBe(4)

    const delta3 = new Delta()
    delta3.insert('today', { color: 'green' })
    delta3.insert(1, { frag: 'end' })
    const f3 = new LayoutFrame()
    f3.readFromOps(delta3.ops)

    f3.setMaxWidth(30)
    f3.layout()
    expect(f3.lines.length).toBe(5)

    const delta4 = new Delta()
    delta4.insert('你', { color: 'green' })
    delta4.insert(1, { frag: 'end' })
    const f4 = new LayoutFrame()
    f4.readFromOps(delta4.ops)

    f4.setMaxWidth(40)
    f4.layout()
    expect(f4.lines.length).toBe(1)
  })

  test('layout frame with chinese', () => {
    const delta1 = new Delta()
    delta1.insert('他说道：“今天天气不错！”')
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(300)
    f1.layout()
    expect(f1.lines.length).toBe(2)
    expect(f1.lines[0].children.length).toBe(7)
    expect(f1.lines[0].children[6].x).toBe(260)

    const delta2 = new Delta()
    delta2.insert('一')
    delta2.insert('二三四', { color: 'red' })
    delta2.insert(1, { frag: 'end', align: 'scattered' })
    const f2 = new LayoutFrame()
    f2.readFromOps(delta2.ops)

    f2.setMaxWidth(100)
    f2.layout()
    expect(f2.lines.length).toBe(2)
  })

  test('layout frame with background', () => {
    const delta1 = new Delta()
    delta1.insert('一')
    delta1.insert('二叄', { background: 'red' })
    delta1.insert('肆', { background: 'red' })
    delta1.insert('伍')
    delta1.insert('陆柒', { background: 'red' })
    delta1.insert('捌玖', { background: 'blue' })
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(400)
    f1.layout()
    expect(f1.lines.length).toBe(1)

    mockCtx.clearLog()
    f1.draw(mockCtx, 0, 0, 200)
    const fillRectCalls = mockCtx.log.filter(l => l.func === 'fillRect')
    expect(fillRectCalls.length).toBe(3)
    expect(fillRectCalls[0].args[0]).toBe(45)
    expect(fillRectCalls[0].args[2]).toBe(135)
    expect(fillRectCalls[2].args[0]).toBe(315)
    expect(fillRectCalls[2].args[2]).toBe(85)
  })

  test('layout frame with underline', () => {
    const delta1 = new Delta()
    delta1.insert('一')
    delta1.insert('二叄', { underline: true })
    delta1.insert('肆', { underline: true, color: 'red' })
    delta1.insert('伍')
    delta1.insert('陆柒', { underline: true })
    delta1.insert('捌玖')
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(400)
    f1.layout()
    expect(f1.lines.length).toBe(1)

    mockCtx.clearLog()
    f1.draw(mockCtx, 0, 0, 200)
    const fillRectCalls = mockCtx.log.filter(l => l.func === 'lineTo')
    expect(fillRectCalls.length).toBe(3)
    expect(fillRectCalls[0].args[0]).toBe(135)
    expect(fillRectCalls[1].args[0]).toBe(180)
    expect(fillRectCalls[2].args[0]).toBe(315)
  })

  test('layout frame with strike', () => {
    const delta1 = new Delta()
    delta1.insert('一')
    delta1.insert('二叄', { strike: true })
    delta1.insert('肆', { strike: true, color: 'red' })
    delta1.insert('伍')
    delta1.insert('陆柒', { strike: true })
    delta1.insert('捌玖')
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(400)
    f1.layout()
    expect(f1.lines.length).toBe(1)

    mockCtx.clearLog()
    f1.draw(mockCtx, 0, 0, 200)
    const fillRectCalls = mockCtx.log.filter(l => l.func === 'lineTo')
    expect(fillRectCalls.length).toBe(3)
    expect(fillRectCalls[0].args[0]).toBe(135)
    expect(fillRectCalls[1].args[0]).toBe(180)
    expect(fillRectCalls[2].args[0]).toBe(315)
  })

  test('layout frame with underline', () => {
    const delta1 = new Delta()
    delta1.insert('一')
    delta1.insert('二叄', { composing: true })
    delta1.insert('肆', { composing: true, color: 'red' })
    delta1.insert('伍')
    delta1.insert('陆柒', { composing: true })
    delta1.insert('捌玖')
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(400)
    f1.layout()
    expect(f1.lines.length).toBe(1)

    mockCtx.clearLog()
    f1.draw(mockCtx, 0, 0, 200)
    const fillRectCalls = mockCtx.log.filter(l => l.func === 'lineTo')
    expect(fillRectCalls.length).toBe(2)
    expect(fillRectCalls[0].args[0]).toBe(180)
    expect(fillRectCalls[1].args[0]).toBe(315)
  })
})

describe('layout frame pos', () => {
  test('layout frame getDocumentPos', () => {
    const delta1 = new Delta()
    delta1.insert('一')
    delta1.insert('二叄', { background: 'red' })
    delta1.insert('肆', { background: 'red' })
    delta1.insert('伍')
    delta1.insert('陆柒', { background: 'red' })
    delta1.insert('捌玖', { background: 'blue' })
    delta1.insert(1, { frag: 'end', align: 'scattered' })
    const f1 = new LayoutFrame()
    f1.readFromOps(delta1.ops)

    f1.setMaxWidth(190)
    f1.layout()
    const singleLineHeight = getPlatform().convertPt2Px[FragmentTextDefaultAttributes.size] * f1.attributes.linespacing
    expect(f1.lines.length).toBe(3)
    expect(f1.getDocumentPos(-1, -1, true)).toEqual({ index: 0, inner: null })
    expect(f1.getDocumentPos(0, 0, true)).toEqual({ index: 0, inner: null })
    expect(f1.getDocumentPos(190, 0, true)).toEqual({ index: 4, inner: null })
    expect(f1.getDocumentPos(0, singleLineHeight, true)).toEqual({ index: 0, inner: null })
    expect(f1.getDocumentPos(190, singleLineHeight, true)).toEqual({ index: 4, inner: null })
    expect(f1.getDocumentPos(0, singleLineHeight + 1, true)).toEqual({ index: 4, inner: null })
    expect(f1.getDocumentPos(190, singleLineHeight + 1, true)).toEqual({ index: 8, inner: null })
    expect(f1.getDocumentPos(0, singleLineHeight * 2, true)).toEqual({ index: 8, inner: null })
    expect(f1.getDocumentPos(190, singleLineHeight * 3, true)).toEqual({ index: 9, inner: null })
    expect(f1.getDocumentPos(80, 0, true)).toEqual({ index: 2, inner: null })
  })
})
