import { increaseId } from '../src/scripts/Common/util'

test('increase id is number', () => {
  expect(typeof increaseId()).toBe('number')
})
