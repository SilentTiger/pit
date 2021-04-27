import Delta from 'quill-delta-enhanced'

export function getEmptyDocContent(): Delta {
  const stringifyContent = '[1,{"frag":"end","block":"para"}]\n'
  const delta = Delta.parse(stringifyContent)
  return delta!
}
