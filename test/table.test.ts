import Delta from 'quill-delta-enhanced'
import Table from '../src/scripts/Block/Table'
import Document from '../src/scripts/Document/Document'
import { compareDocPos } from '../src/scripts/Common/util'

function createTableDelta(data: string[][]): Delta {
  const tableDelta = new Delta()
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const rowData = data[rowIndex]
    const rowDelta = new Delta()
    for (let cellIndex = 0; cellIndex < rowData.length; cellIndex++) {
      const cellData = rowData[cellIndex]
      const cellDelta = new Delta()
      ;`${cellData}\n`.split('\n').forEach((paraContent: string) => {
        cellDelta.insert(paraContent)
        cellDelta.insert(1, { frag: 'end', block: 'para' })
      })

      rowDelta.insert(cellDelta)
    }
    tableDelta.insert(rowDelta)
  }
  return tableDelta
}

describe('correctSelectionPos', () => {
  test('select whole table', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['a', 'b'],
        ['c', 'd'],
      ]),
      { block: 'table' },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start = { index: 0, inner: null }
      const end = { index: 1, inner: null }
      const newSelection = table.correctSelectionPos(start, end)

      expect(newSelection.length).toBe(1)
      expect(compareDocPos(start, newSelection[0].start!)).toBe(0)
      expect(compareDocPos(end, newSelection[0].end!)).toBe(0)
    }
  })

  test('select content in first table cell', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['a', 'b'],
        ['c', 'd'],
      ]),
      { block: 'table' },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 0, inner: null } } } }
      const end = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const newSelection = table.correctSelectionPos(start, end)

      expect(newSelection.length).toBe(1)
      expect(compareDocPos(start, newSelection[0].start!)).toBe(0)
      expect(compareDocPos(end, newSelection[0].end!)).toBe(0)
    }
  })

  test('select content in last table cell', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['a', 'b'],
        ['c', 'de'],
      ]),
      { block: 'table' },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start = { index: 0, inner: { index: 1, inner: { index: 1, inner: { index: 1, inner: null } } } }
      const end = { index: 0, inner: { index: 1, inner: { index: 1, inner: { index: 2, inner: null } } } }
      const newSelection = table.correctSelectionPos(start, end)

      expect(newSelection.length).toBe(1)
      expect(compareDocPos(start, newSelection[0].start!)).toBe(0)
      expect(compareDocPos(end, newSelection[0].end!)).toBe(0)
    }
  })

  // 从表格前面开始，一直选到某一个单元格里面
  test('select from front of table to table cell', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['a', 'b'],
        ['c', 'de'],
      ]),
      { block: 'table' },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start1 = null
      const end1 = { index: 0, inner: { index: 1, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const newSelection1 = table.correctSelectionPos(start1, end1)

      expect(newSelection1.length).toBe(1)
      expect(newSelection1[0].start).toBe(null)
      expect(compareDocPos(newSelection1[0].end!, { index: 1, inner: null })).toBe(0)

      const start2 = null
      const end2 = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const newSelection2 = table.correctSelectionPos(start2, end2)

      expect(newSelection2.length).toBe(1)
      expect(newSelection2[0].start).toBe(null)
      expect(compareDocPos(newSelection2[0].end!, { index: 0, inner: { index: 1, inner: null } })).toBe(0)
    }
  })

  // 从表格中某个单元格开始，一直选到表格后面
  test('select from table cell to back of table', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['a', 'b'],
        ['c', 'de'],
      ]),
      { block: 'table' },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start1 = { index: 0, inner: { index: 1, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const end1 = null
      const newSelection1 = table.correctSelectionPos(start1, end1)

      expect(newSelection1.length).toBe(1)
      expect(compareDocPos(newSelection1[0].start!, { index: 0, inner: { index: 1, inner: null } })).toBe(0)
      expect(newSelection1[0].end).toBe(null)

      const start2 = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const end2 = null
      const newSelection2 = table.correctSelectionPos(start2, end2)

      expect(newSelection2.length).toBe(1)
      expect(compareDocPos(newSelection2[0].start!, { index: 0, inner: null })).toBe(0)
      expect(newSelection2[0].end).toBe(null)
    }
  })

  // 在同一行中垮单元格选中
  test('select from cell to cell in one row', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['aa', 'bb', 'cc'],
        ['dd', 'ee', 'ff'],
      ]),
      { block: 'table' },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start1 = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const end1 = { index: 0, inner: { index: 0, inner: { index: 1, inner: { index: 1, inner: null } } } }
      const newSelection1 = table.correctSelectionPos(start1, end1)

      expect(newSelection1.length).toBe(1)
      expect(
        compareDocPos(newSelection1[0].start!, { index: 0, inner: { index: 0, inner: { index: 0, inner: null } } }),
      ).toBe(0)
      expect(
        compareDocPos(newSelection1[0].end!, { index: 0, inner: { index: 0, inner: { index: 2, inner: null } } }),
      ).toBe(0)

      const start2 = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const end2 = { index: 0, inner: { index: 0, inner: { index: 2, inner: { index: 1, inner: null } } } }
      const newSelection2 = table.correctSelectionPos(start2, end2)

      expect(newSelection2.length).toBe(1)
      expect(compareDocPos(newSelection2[0].start!, { index: 0, inner: { index: 0, inner: null } })).toBe(0)
      expect(compareDocPos(newSelection2[0].end!, { index: 0, inner: { index: 1, inner: null } })).toBe(0)
    }
  })

  // 在不同行中垮单元格选中
  test('select from cell to cell in different rows', () => {
    const delta = new Delta()
    delta.insert('01')
    delta.insert(1, { frag: 'end', block: 'para' })

    delta.insert(
      createTableDelta([
        ['aa', 'bb', 'cc'],
        ['dd', 'ee', 'ff'],
        ['gg', 'hh', 'ii'],
      ]),
      { block: 'table', colWidth: [20, 20, 20] },
    )

    delta.insert('ab')
    delta.insert(1, { frag: 'end', block: 'para' })
    const doc = new Document()
    doc.readFromChanges(delta)
    doc.layout()
    expect(doc.children.length).toBe(3)
    expect(doc.children[1] instanceof Table).toBe(true)

    if (doc.children[1] instanceof Table) {
      const table: Table = doc.children[1] as Table
      const start1 = {
        index: 0,
        inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } },
      }
      const end1 = {
        index: 0,
        inner: { index: 1, inner: { index: 1, inner: { index: 1, inner: null } } },
      }
      const newSelection1 = table.correctSelectionPos(start1, end1)

      expect(newSelection1.length).toBe(2)
      expect(
        compareDocPos(newSelection1[0].start!, {
          index: 0,
          inner: { index: 0, inner: { index: 0, inner: null } },
        }),
      ).toBe(0)
      expect(
        compareDocPos(newSelection1[0].end!, {
          index: 0,
          inner: { index: 0, inner: { index: 2, inner: null } },
        }),
      ).toBe(0)

      const start2 = { index: 0, inner: { index: 0, inner: { index: 0, inner: { index: 1, inner: null } } } }
      const end2 = { index: 0, inner: { index: 0, inner: { index: 2, inner: { index: 1, inner: null } } } }
      const newSelection2 = table.correctSelectionPos(start2, end2)

      expect(newSelection2.length).toBe(1)
      expect(compareDocPos(newSelection2[0].start!, { index: 0, inner: { index: 0, inner: null } })).toBe(0)
      expect(compareDocPos(newSelection2[0].end!, { index: 0, inner: { index: 1, inner: null } })).toBe(0)
    }
  })
})
