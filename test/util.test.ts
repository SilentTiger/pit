import { convertTo26, convertToRoman, increaseId, numberToChinese } from '../src/scripts/Common/util'

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
