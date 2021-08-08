import Delta from 'quill-delta-enhanced'
import ListItem from '../src/scripts/DocStructure/ListItem'

describe('read list item', () => {
  test('simple list item', () => {
    const d1 = new Delta()
    d1.insert('listitem 1')
    d1.insert(1, { frag: 'end' })
    d1.insert('listitem 2')
    d1.insert(1, { frag: 'end' })
    d1.insert('listitem 3')
    d1.insert(1, { frag: 'end', block: 'list', listId: 'HC8W', 'list-type': 'decimal' })
    const l1 = new ListItem()
    l1.readFromOps(d1.ops)
    l1.setWidth(500)
    l1.layout()
    expect(l1.titleIndex).toBe(0)
    expect(l1.children.length).toBe(3)
    expect(l1.titleWidth).toBe(80)
    expect(l1.height).toBe(69.8)
  })
})
