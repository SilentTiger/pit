import Delta from 'quill-delta-enhanced'
import platform from './Platform.nodetest'
import { initPlatform } from '../src/scripts/Platform'
import StructureRegistrar from '../src/scripts/StructureRegistrar'
import LayoutFrame from '../src/scripts/DocStructure/LayoutFrame'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import FragmentParaEnd from '../src/scripts/DocStructure/FragmentParaEnd'
import FragmentImage from '../src/scripts/DocStructure/FragmentImage'
import FragmentDate from '../src/scripts/DocStructure/FragmentDate'
import RunParaEnd from '../src/scripts/RenderStructure/RunParaEnd'
import MockCanvas from './MockCanvas'

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
  })
})
