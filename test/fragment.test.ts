import Delta from 'quill-delta-enhanced'
import LayoutFrame from '../src/scripts/DocStructure/LayoutFrame'
import { EnumFont } from '../src/scripts/DocStructure/EnumTextStyle'
import FragmentText from '../src/scripts/DocStructure/FragmentText'
import FragmentDate from '../src/scripts/DocStructure/FragmentDate'
import FragmentImage from '../src/scripts/DocStructure/FragmentImage'
import FragmentParaEnd from '../src/scripts/DocStructure/FragmentParaEnd'
import type Fragment from '../src/scripts/DocStructure/Fragment'

describe('common', () => {
  test('unknown font value', () => {
    expect(EnumFont.getFontName('unknown')).toBe('Default')
  })
})

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
    expect(f2.toText()).toEqual('text content')
    expect(f2.toText({ start: { index: 4, inner: null }, end: { index: 5, inner: null } })).toEqual(' ')
    expect(f2.toHtml()).toEqual(
      '<span style=background-color:#ffffff;color:#494949;font-family:Arial,sans-serif;font-size:11pt;>text content</span>',
    )
    expect(f2.toHtml({ start: { index: 1, inner: null }, end: { index: 4, inner: null } })).toEqual(
      '<span style=background-color:#ffffff;color:#494949;font-family:Arial,sans-serif;font-size:11pt;>ext</span>',
    )
  })

  test('fragment text insertText', () => {
    const delta = new Delta()
    delta.insert('text content', { font: 'arial' })
    const f = new FragmentText()
    f.readFromOps(delta.ops[0])

    let res: Fragment[] = []
    res = f.insertText('', { index: 5, inner: null })
    expect(res).toEqual([])

    res = f.insertText('insert ', { index: 5, inner: null }, { size: 21 })
    expect(res.length).toEqual(3)

    const l1 = new LayoutFrame()
    l1.addLast(f)
    expect(l1.children.length).toBe(1)

    l1.insertText('A', { index: 0, inner: null }, { size: 21 })
    expect(l1.children.length).toBe(2)
    expect(l1.children[0].attributes.size).toBe(21)
    expect(l1.children[1].attributes.size).toBe(11)

    l1.insertText('B', { index: 13, inner: null }, { size: 21 })
    expect(l1.children.length).toBe(3)
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
    f.delete({ start: { index: 1, inner: null }, end: { index: 4, inner: null } })
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
    parent1.addLast(f1)
    parent1.format({ color: 'red' }, { start: { index: 0, inner: null }, end: { index: 4, inner: null } })
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
    paren2.addLast(f2)
    paren2.format({ color: 'red' }, { start: { index: 4, inner: null }, end: { index: 12, inner: null } })
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
    paren3.addLast(f3)
    paren3.format({ color: 'red' }, { start: { index: 4, inner: null }, end: { index: 5, inner: null } })
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
      public override bubbleUp(type: string, data: any) {
        taped = true
      }
    }

    const mockParent = new MockLayoutFrame()
    mockParent.addLast(f1)
    expect(taped).toBe(false)
    f1.onPointerTap()
    expect(taped).toBe(false)

    f1.setAttributes({ link: 'link' })
    f1.onPointerTap()
    expect(taped).toBe(true)
    expect(f1.toHtml()).toEqual(
      `<a href=link style=background-color:#ffffff;color:#494949;font-family:Arial,sans-serif;font-size:11pt;>${f1.content}</a>`,
    )
  })
})

describe('fragment date', () => {
  test('simple fragment date', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 0 })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])

    expect(f1.stringContent).toBe(`⏰${new Date(f1.attributes.date).toDateString()}`)
  })

  test('fragment date width font', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 0, font: 'arial' })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])

    expect(f1.stringContent).toBe(`⏰${new Date(f1.attributes.date).toDateString()}`)
    expect(f1.attributes.font).toBe(EnumFont.getFontValue('arial'))
  })

  test('fragment date width unknown font', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 0, font: 'unknown font' })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])

    expect(f1.stringContent).toBe(`⏰${new Date(f1.attributes.date).toDateString()}`)
    expect(f1.attributes.font).toBe(EnumFont.getFontValue('Default'))
  })

  test('fragment date toOp', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 1 })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])
    expect(f1.toOp(false)).toEqual({ insert: 1, attributes: { frag: 'date', date: time, type: 1 } })

    const delta2 = new Delta()
    delta2.insert(1, { frag: 'date', date: time, font: 'arial' })
    const f2 = new FragmentDate()
    f2.readFromOps(delta2.ops[0])
    expect(f2.toOp(false)).toEqual({ insert: 1, attributes: { frag: 'date', date: time, font: 'arial' } })
  })

  test('fragment date toHtml', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 1 })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])
    expect(f1.toHtml()).toEqual(
      `<span style=background-color:#ffffff;color:#494949;font-family:BlinkMacSystemFont,"PingFang SC",Helvetica,Tahoma,Arial,"Hiragino Sans GB","Microsoft YaHei","\\5FAE\\8F6F\\96C5\\9ED1",sans-serif;font-size:11pt;>${f1.stringContent}</span>`,
    )
  })

  test('fragment date toText', () => {
    const time = Date.now()

    const delta1 = new Delta()
    delta1.insert(1, { frag: 'date', date: time, type: 1 })
    const f1 = new FragmentDate()
    f1.readFromOps(delta1.ops[0])
    expect(f1.toText()).toEqual(f1.stringContent)
  })
})

describe('fragment image', () => {
  test('simple fragment image', () => {
    const delta1 = new Delta()
    delta1.insert(1, {
      src: 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail',
      frag: 'img',
      layout: 'embed',
      margin: 'none',
    })
    const f1 = new FragmentImage()
    f1.readFromOps(delta1.ops[0])

    expect(f1.attributes.oriHeight).toBe(0)
    expect(f1.attributes.height).toBe(0)
  })

  test('simple fragment image width attributes', () => {
    const url = 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail'
    const delta1 = new Delta()
    delta1.insert(1, {
      src: url,
      frag: 'img',
      layout: 'embed',
      margin: 'none',
      width: 604,
      height: 340,
      'ori-height': 340,
      'ori-width': 604,
    })
    const f1 = new FragmentImage()
    f1.readFromOps(delta1.ops[0])

    expect(f1.attributes.oriHeight).toBe(340)
    expect(f1.toText()).toBe('')
    expect(f1.toHtml()).toBe(`<img style=background-color:#ffffff;color:#494949;width:604;height:340; src="${url}"/>`)
    expect(f1.toOp(false)).toEqual({
      insert: 1,
      attributes: {
        src: url,
        frag: 'img',
        margin: 'none',
        width: 604,
        height: 340,
        'ori-height': 340,
        'ori-width': 604,
        oriHeight: 340,
        oriWidth: 604,
      },
    })
  })

  test('fragment image format', () => {
    const url = 'https://uploader.shimo.im/f/issCVeiEBxMnQcYk.png!thumbnail'
    const delta1 = new Delta()
    delta1.insert(1, {
      src: url,
      frag: 'img',
      layout: 'embed',
      margin: 'none',
      width: 604,
      height: 340,
      'ori-height': 340,
      'ori-width': 604,
    })
    const f1 = new FragmentImage()
    f1.readFromOps(delta1.ops[0])

    f1.format({ width: 100 })
    expect(f1.originalAttributes?.width).toBe(100)
    expect(f1.getFormat()).toEqual({
      background: '#ffffff',
      color: '#494949',
      strike: false,
      underline: false,
      src: url,
      margin: 'none',
      width: 100,
      height: 340,
      oriHeight: 340,
      oriWidth: 604,
    })

    expect(f1.insertEnter({ index: 0, inner: null })).toBe(null)
    expect(f1.insertText('content', { index: 1, inner: null })).toEqual([])

    const delta2 = new Delta()
    delta2.insert(1, {
      src: url,
      frag: 'img',
      margin: 'none',
      width: 604,
      height: 340,
      'ori-height': 340,
      'ori-width': 604,
    })
    const f2 = new FragmentImage()
    f2.readFromOps(delta2.ops[0])

    expect(f1.eat(f2)).toBe(false)
  })
})

describe('fragment paraEnd', () => {
  test('simple fragment paraEnd', () => {
    const delta1 = new Delta()
    delta1.insert(1, { frag: 'end', block: 'para', line: 'uMSr' })
    const f1 = new FragmentParaEnd()
    f1.readFromOps(delta1.ops[0])

    expect(f1.toHtml()).toEqual('')
  })
})
