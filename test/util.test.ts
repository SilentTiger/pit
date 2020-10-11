import { increaseId } from '../src/scripts/Common/util'

test('increase id is number', () => {
  const firstId = increaseId()
  const secondId = increaseId()
  expect(typeof firstId).toBe('number')
  expect(typeof secondId).toBe('number')
  expect(firstId).toBe(secondId - 1)
})
