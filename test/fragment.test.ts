import Delta from 'quill-delta-enhanced'
import LayoutFrame from '../src/scripts/DocStructure/LayoutFrame'
import { EnumFont } from '../src/scripts/DocStructure/EnumTextStyle'
import FragmentText from '../src/scripts/DocStructure/FragmentText'

describe('fragment text', () => {
  test('fragment text to op', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { color: 'red' })
    const f1 = new FragmentText()
    f1.readFromOps(delta1.ops[0])
    expect(f1.toOp()).toEqual({ insert: 'text content', attributes: { color: 'red' } })

    const delta2 = new Delta()
    delta2.insert('text content', { font: 'arial' })
    const f2 = new FragmentText()
    f2.readFromOps(delta2.ops[0])
    expect(f2.toOp()).toEqual({ insert: 'text content', attributes: { font: 'arial' } })
  })

  test('fragment text insertEnter', () => {
    const delta = new Delta()
    delta.insert('text content', { font: 'arial' })
    const f = new FragmentText()
    f.readFromOps(delta.ops[0])
    const newFrag = f.insertEnter({ index: 1, inner: null })
    expect(f.content).toBe('t')
    expect(newFrag?.content).toBe('ext content')
    expect(f.originalAttributes !== newFrag?.originalAttributes).toBe(true)
  })

  test('fragment text delete', () => {
    const delta = new Delta()
    delta.insert('text content', { font: 'arial' })
    const f = new FragmentText()
    f.readFromOps(delta.ops[0])
    f.delete({ index: 1, inner: null }, { index: 4, inner: null })
    expect(f.content).toBe('t content')
  })

  test('fragment text eat', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { font: 'arial' })
    const f1 = new FragmentText()
    f1.readFromOps(delta1.ops[0])

    const delta2 = new Delta()
    delta2.insert('text content', { font: 'arial' })
    const f2 = new FragmentText()
    f2.readFromOps(delta2.ops[0])
    const eatRes1 = f1.eat(f2)
    expect(eatRes1).toBe(true)
    expect(f1.content).toBe('text contenttext content')

    const delta3 = new Delta()
    delta3.insert('text content', { font: 'arial' })
    const f3 = new FragmentText()
    f2.readFromOps(delta3.ops[0])
    const eatRes2 = f1.eat(f3)
    expect(eatRes2).toBe(false)
  })

  test('fragment text format', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { font: 'arial' })
    const f1 = new FragmentText()
    f1.readFromOps(delta1.ops[0])

    f1.format({ color: 'red' })
    expect(f1.attributes.color).toBe('red')
    expect(f1.attributes.font).toBe(EnumFont.getFontValue('arial'))
  })

  test('fragment text format width range', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { font: 'arial' })
    const f1 = new FragmentText()
    f1.readFromOps(delta1.ops[0])

    const parent1 = new LayoutFrame()
    parent1.add(f1)
    f1.format({ color: 'red' }, { start: { index: 0, inner: null }, end: { index: 4, inner: null } })
    expect(parent1.children.length).toBe(2)
    expect(parent1.children[0].attributes.color).toBe('red')
    expect((parent1.children[0] as FragmentText).content).toBe('text')
    expect(parent1.children[1].attributes.color).toBe('#494949')
    expect((parent1.children[1] as FragmentText).content).toBe(' content')

    const delta2 = new Delta()
    delta2.insert('text content', { font: 'arial' })
    const f2 = new FragmentText()
    f2.readFromOps(delta2.ops[0])

    const paren2 = new LayoutFrame()
    paren2.add(f2)
    f2.format({ color: 'red' }, { start: { index: 4, inner: null }, end: { index: 12, inner: null } })
    expect(paren2.children.length).toBe(2)
    expect(paren2.children[0].attributes.color).toBe('#494949')
    expect((paren2.children[0] as FragmentText).content).toBe('text')
    expect(paren2.children[1].attributes.color).toBe('red')
    expect((paren2.children[1] as FragmentText).content).toBe(' content')

    const delta3 = new Delta()
    delta3.insert('text content', { font: 'arial' })
    const f3 = new FragmentText()
    f3.readFromOps(delta3.ops[0])

    const paren3 = new LayoutFrame()
    paren3.add(f3)
    f3.format({ color: 'red' }, { start: { index: 4, inner: null }, end: { index: 5, inner: null } })
    expect(paren3.children.length).toBe(3)
    expect(paren3.children[0].attributes.color).toBe('#494949')
    expect((paren3.children[0] as FragmentText).content).toBe('text')
    expect(paren3.children[1].attributes.color).toBe('red')
    expect((paren3.children[1] as FragmentText).content).toBe(' ')
    expect(paren3.children[2].attributes.color).toBe('#494949')
    expect((paren3.children[2] as FragmentText).content).toBe('content')
  })

  test('fragment text on pointer event', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { font: 'arial' })
    const f1 = new FragmentText()
    f1.readFromOps(delta1.ops[0])

    expect((f1 as any).isPointerHover).toBe(false)
    f1.onPointerEnter()
    expect((f1 as any).isPointerHover).toBe(true)
    f1.onPointerLeave()
    expect((f1 as any).isPointerHover).toBe(false)
  })

  test('fragment text on pointer tap', () => {
    const delta1 = new Delta()
    delta1.insert('text content', { font: 'arial' })
    const f1 = new FragmentText()
    f1.readFromOps(delta1.ops[0])

    let taped = false
    class MockLayoutFrame extends LayoutFrame {
      public bubbleUp(type: string, data: any) {
        taped = true
      }
    }

    const mockParent = new MockLayoutFrame()
    mockParent.add(f1)
    expect(taped).toBe(false)
    f1.onPointerTap()
    expect(taped).toBe(false)

    f1.setAttributes({ link: 'link' })
    f1.onPointerTap()
    expect(taped).toBe(true)
  })
})
