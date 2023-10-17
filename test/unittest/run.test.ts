import Delta from 'quill-delta-enhanced'
import RunText from '../../src/scripts/RenderStructure/RunText'
import type FragmentText from '../../src/scripts/Fragment/FragmentText'
import { getPlatform } from '../../src/scripts/Platform'
import { EnumCursorType } from '../../src/scripts/Common/EnumCursorType'
import FragmentParaEnd from '../../src/scripts/Fragment/FragmentParaEnd'
import RunParaEnd from '../../src/scripts/RenderStructure/RunParaEnd'
import FragmentDate from '../../src/scripts/Fragment/FragmentDate'
import RunDate from '../../src/scripts/RenderStructure/RunDate'
import RunImage from '../../src/scripts/RenderStructure/RunImage'
import FragmentImage from '../../src/scripts/Fragment/FragmentImage'
import { create, createRunByFragment } from '../../src/scripts/Common/IoC'
import Fragment from '../../src/scripts/Fragment/Fragment'

class TempFragment extends Fragment {}

describe('run factory', () => {
  test('create run text', () => {
    const frag = create<FragmentText>('')
    frag.readFromOps({ insert: 'hello world' })
    const run = createRunByFragment(frag)
    expect(run instanceof RunText).toBe(true)
  })

  test('create run date', () => {
    const frag = new FragmentDate()
    frag.readFromOps({ insert: 1, attributes: { date: Date.now(), frag: 'date' } })
    const run = createRunByFragment(frag)
    expect(run instanceof RunDate).toBe(true)
  })

  test('create run image', () => {
    const frag = new FragmentImage()
    frag.readFromOps({ insert: 1, attributes: { gallery: '', frag: 'image' } })
    const run = createRunByFragment(frag)
    expect(run instanceof RunImage).toBe(true)
  })

  test('create run image', () => {
    const frag = new FragmentParaEnd()
    frag.readFromOps({ insert: 1 })
    const run = createRunByFragment(frag)
    expect(run instanceof RunParaEnd)
  })

  test('create run unknown', () => {
    const frag = new TempFragment()
    expect(() => {
      createRunByFragment(frag)
    }).toThrow(new Error(`can not find run constructor: ${frag}`))
  })
})

describe('run', () => {
  test('setPosition', () => {
    const frag = new FragmentImage()
    frag.readFromOps({ insert: 1, attributes: { gallery: '', frag: 'image' } })
    const run = createRunByFragment(frag)
    expect(run.x).toBe(0)
    expect(run.y).toBe(0)
    run.setPosition(101, 102)
    expect(run.x).toBe(101)
    expect(run.y).toBe(102)
  })

  test('getCursorType', () => {
    const frag = new FragmentImage()
    frag.readFromOps({ insert: 1, attributes: { gallery: '', frag: 'image' } })
    const run = createRunByFragment(frag)
    expect(run.getCursorType()).toBe(EnumCursorType.Default)
  })

  test('onPointerXXX enter & leave', () => {
    const frag = new FragmentImage()
    frag.readFromOps({ insert: 1, attributes: { gallery: '', frag: 'image' } })
    const run = createRunByFragment(frag)
    expect(run.isPointerHover).toBe(false)
    expect(frag.isPointerHover).toBe(false)
    run.onPointerEnter(0, 0)
    expect(run.isPointerHover).toBe(true)
    expect(frag.isPointerHover).toBe(true)
    run.onPointerLeave()
    expect(run.isPointerHover).toBe(false)
    expect(frag.isPointerHover).toBe(false)
  })
})

describe('run text', () => {
  test('simple run text', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { color: 'red' })
    const f1 = create<FragmentText>('')
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunText>(RunText.typeName, f1)
    expect(r1.height).toBe((37 * getPlatform().convertPt2Px[11]) / 40)
  })

  test('run text getCursorType', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { color: 'red' })
    const f1 = create<FragmentText>('')
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunText>(RunText.typeName, f1)
    expect(r1.getCursorType()).toEqual(EnumCursorType.Text)

    f1.setAttributes({ link: true })
    const r2 = create<RunText>(RunText.typeName, f1)
    expect(r2.getCursorType()).toEqual(EnumCursorType.Pointer)
  })

  test('run text getCoordinatePosX', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { color: 'red' })
    const f1 = create<FragmentText>('')
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunText>(RunText.typeName, f1)

    expect(r1.getCoordinatePosX(0)).toEqual(0)
    expect(r1.getCoordinatePosX(1)).toEqual(40)
    expect(r1.getCoordinatePosX(3)).toEqual(120)
    expect(r1.getCoordinatePosX(30)).toEqual(480)
  })

  test('run text getDocumentPos', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { color: 'red' })
    const f1 = create<FragmentText>('')
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunText>(RunText.typeName, f1)

    expect(r1.getDocumentPos(0, 0, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(-1, -1, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(480, 50, true)).toEqual({ index: 12, inner: null })
    expect(r1.getDocumentPos(500, 50, true)).toEqual({ index: 12, inner: null })
    expect(r1.getDocumentPos(19, 50, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(29, 50, true)).toEqual({ index: 1, inner: null })
    expect(r1.getDocumentPos(49, 50, true)).toEqual({ index: 1, inner: null })

    const delta2 = new Delta()
    delta2.insert('t')
    const f2 = create<FragmentText>('')
    f2.readFromOps(delta2.ops[0])

    const r2 = create<RunText>(RunText.typeName, f2)
    r2.calWidth()
    expect(r2.getDocumentPos(10, 50, true)).toEqual({ index: 0, inner: null })
    expect(r2.getDocumentPos(20, 50, true)).toEqual({ index: 1, inner: null })

    const delta3 = new Delta()
    delta3.insert('t')
    const f3 = create<FragmentText>('')
    f3.readFromOps(delta3.ops[0])
    f3.setContent('')

    const r3 = create<RunText>(RunText.typeName, f3)
    r3.calWidth()
    expect(r3.getDocumentPos(-1, 50, true)).toEqual({ index: 0, inner: null })
    expect(r3.getDocumentPos(0, 50, true)).toEqual({ index: 0, inner: null })
    expect(r3.getDocumentPos(10, 50, true)).toEqual({ index: 0, inner: null })
  })
})

describe('run paraEnd', () => {
  test('simple run paraEnd', () => {
    const delta1 = new Delta()
    delta1.insert(1, { frag: 'end', block: 'para' })
    const f1 = new FragmentParaEnd()
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunParaEnd>(RunParaEnd.typeName, f1)
    r1.calSize()
    expect(r1.width).toBe(5)
    expect(r1.height).toBe(getPlatform().convertPt2Px[11])
  })

  test('run para end getDocumentPos', () => {
    const delta1 = new Delta()
    delta1.insert(1, { frag: 'end', block: 'para' })
    const f1 = new FragmentParaEnd()
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunParaEnd>(RunParaEnd.typeName, f1)
    expect(r1.getDocumentPos(-1, -1, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(0, 0, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(5, 5, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(10, 10, true)).toEqual({ index: 0, inner: null })
  })
})

describe('run date', () => {
  test('simple run date', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 0 })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunDate>(RunDate.typeName, f1)
    r1.calSize()
    expect(r1.height).toBe(getPlatform().convertPt2Px[11])
    expect(r1.width).toBe(f1.stringContent.length * 40)
  })

  test(' run date getDocumentPos', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 0 })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunDate>(RunDate.typeName, f1)
    r1.calSize()

    expect(r1.getDocumentPos(0, 0, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(-1, -1, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(r1.width / 2 - 1, 50, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(r1.width / 2, 50, true)).toEqual({ index: 1, inner: null })
    expect(r1.getDocumentPos(r1.width, 50, true)).toEqual({ index: 1, inner: null })
    expect(r1.getDocumentPos(r1.width + 1, 50, true)).toEqual({ index: 1, inner: null })
  })
})

describe('run image', () => {
  test('simple run image', () => {
    const delta1 = new Delta()
    delta1.insert(1, {
      gallery: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail',
      frag: 'img',
      layout: 'embed',
      margin: 'none',
      width: 101,
      height: 102,
    })
    const f1 = new FragmentImage()
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunImage>(RunImage.typeName, f1)
    expect(r1.calHeight()).toBe(102)
    expect(r1.calWidth()).toBe(101)
    expect(r1.height).toBe(102)
    expect(r1.width).toBe(101)
  })

  test('run image getDocumentPos', () => {
    const delta1 = new Delta()
    delta1.insert(1, {
      gallery: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail',
      frag: 'img',
      layout: 'embed',
      margin: 'none',
      width: 101,
      height: 102,
    })
    const f1 = new FragmentImage()
    f1.readFromOps(delta1.ops[0])

    const r1 = create<RunImage>(RunImage.typeName, f1)
    r1.calSize()
    expect(r1.getDocumentPos(-1, -1, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(0, 0, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(50, 50, true)).toEqual({ index: 0, inner: null })
    expect(r1.getDocumentPos(51, 51, true)).toEqual({ index: 1, inner: null })
    expect(r1.getDocumentPos(101, 101, true)).toEqual({ index: 1, inner: null })
  })
})