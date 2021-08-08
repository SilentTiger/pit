import Delta from 'quill-delta-enhanced'
import type { DocPos } from '../src/scripts/Common/DocPos'
import { convertTo26, convertToRoman, increaseId, numberToChinese, transformDocPos } from '../src/scripts/Common/util'

test('increase id is number', () => {
  const firstId = increaseId()
  const secondId = increaseId()
  expect(typeof firstId).toBe('number')
  expect(typeof secondId).toBe('number')
  expect(firstId).toBe(secondId - 1)
})

test('convertTo26', () => {
  expect(convertTo26(1)).toBe('a')
  expect(convertTo26(26)).toBe('z')
  expect(convertTo26(27)).toBe('aa')
  expect(convertTo26(1, true)).toBe('A')
  expect(convertTo26(26, true)).toBe('Z')
  expect(convertTo26(27, true)).toBe('AA')
})

test('numberToChinese', () => {
  expect(numberToChinese(0)).toBe('零')
  expect(numberToChinese(1)).toBe('一')
  expect(numberToChinese(26)).toBe('二十六')
  expect(numberToChinese(906)).toBe('九百零六')
  expect(numberToChinese(926)).toBe('九百二十六')
  expect(numberToChinese(90000)).toBe('九万')
  expect(numberToChinese(100090020)).toBe('一亿零九万零二十')
  expect(numberToChinese(287392926)).toBe('二亿八千七百三十九万二千九百二十六')
})

test('convertToRoman', () => {
  expect(convertToRoman(1)).toBe('i')
  expect(convertToRoman(2)).toBe('ii')
  expect(convertToRoman(4)).toBe('iv')
  expect(convertToRoman(5)).toBe('v')
  expect(convertToRoman(6)).toBe('vi')
  expect(convertToRoman(10)).toBe('x')
  expect(convertToRoman(1, true)).toBe('I')
  expect(convertToRoman(2, true)).toBe('II')
  expect(convertToRoman(4, true)).toBe('IV')
  expect(convertToRoman(5, true)).toBe('V')
  expect(convertToRoman(6, true)).toBe('VI')
  expect(convertToRoman(10, true)).toBe('X')
})

describe('transform doc pos', () => {
  test('simple doc pos', () => {
    const pos1: DocPos = { index: 10, inner: null }
    const transOp = new Delta()
    transOp.retain(1).insert(1)
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 11, inner: null })
  })

  test('simple doc pos with multiple insert', () => {
    const pos1: DocPos = { index: 10, inner: null }
    const transOp = new Delta()
    transOp.retain(1).insert('a').retain(1).insert('bc')
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 13, inner: null })
  })

  test('multi lay doc pos with multiple insert', () => {
    const pos1: DocPos = { index: 10, inner: { index: 2, inner: null } }
    const transOp = new Delta()
    transOp.retain(1).insert('a').retain(1).insert('bc')
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 13, inner: { index: 2, inner: null } })
  })

  test('multi lay doc pos with delete', () => {
    const pos1: DocPos = { index: 10, inner: { index: 2, inner: null } }
    const transOp = new Delta()
    transOp.retain(1).delete(2)
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 8, inner: { index: 2, inner: null } })
  })

  test('multi lay doc pos with multi delete', () => {
    const pos1: DocPos = { index: 10, inner: { index: 2, inner: null } }
    const transOp = new Delta()
    transOp.retain(1).delete(2).retain(3).delete(3)
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 5, inner: { index: 2, inner: null } })
    // continue delete
    transOp.retain(1).delete(6)
    const transformedPos2 = transformDocPos(pos1, transOp)
    expect(transformedPos2).toEqual({ index: 5, inner: null })
  })

  test('multi lay doc pos with insert & delete', () => {
    const pos1: DocPos = { index: 10, inner: { index: 2, inner: null } }
    const transOp = new Delta()
    transOp.retain(1).insert('a').delete(2)
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 9, inner: { index: 2, inner: null } })
    // continue delete
    transOp.retain(4).insert('abc').delete(1)
    const transformedPos2 = transformDocPos(pos1, transOp)
    expect(transformedPos2).toEqual({ index: 11, inner: { index: 2, inner: null } })
  })

  test('multi lay doc pos with over retain', () => {
    const pos1: DocPos = { index: 10, inner: { index: 2, inner: null } }
    const transOp = new Delta()
    transOp.retain(1).insert('a').delete(2).retain(10).insert('bc')
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 9, inner: { index: 2, inner: null } })
  })

  test('multi lay doc pos with deep-in retain', () => {
    const pos1: DocPos = { index: 10, inner: { index: 6, inner: null } }
    const transOp = new Delta()
    transOp.retain(1).insert('a').delete(2).retain(7).retain(new Delta().insert('bc').retain(1).insert('d'))
    const transformedPos1 = transformDocPos(pos1, transOp)
    expect(transformedPos1).toEqual({ index: 9, inner: { index: 9, inner: null } })
  })
})
