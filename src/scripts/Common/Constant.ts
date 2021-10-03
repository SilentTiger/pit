import Delta from 'quill-delta-enhanced'

let defaultDocContentDelta: Delta = new Delta([{ insert: 1, attributes: { frag: 'end', block: 'para' } }])

export const getDefaultDocContentDelta = () => {
  return defaultDocContentDelta
}

export const setDefaultDocContentDelta = (delta: Delta) => {
  defaultDocContentDelta = delta
}
