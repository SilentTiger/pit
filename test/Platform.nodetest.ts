import { FragmentTextDefaultAttributes } from '../src/scripts/DocStructure/FragmentTextAttributes'
import type { IPlatform } from '../src/scripts/Platform'

const getPixelRatio = (context: any): number => 2

const convertPt2Px: number[] = [
  0, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 34, 36, 37, 38,
  40, 41, 42, 44, 45, 46, 48, 49, 50, 52, 53, 54, 56, 57, 58, 60, 61, 62, 64,
]

const createTextFontString = (() => {
  let lastAttrs: any = null
  let lastFontString = ''
  return (attrs: { italic?: boolean; bold?: boolean; size: number; font: string }): string => {
    if (attrs === lastAttrs) {
      return lastFontString
    } else if (
      lastAttrs &&
      lastAttrs.italic === attrs.italic &&
      lastAttrs.bold === attrs.bold &&
      lastAttrs.size === attrs.size &&
      lastAttrs.font === attrs.font
    ) {
      lastAttrs = attrs
      return lastFontString
    } else {
      lastAttrs = attrs
      lastFontString = attrs.italic ? 'italic ' : ''
      if (attrs.bold) {
        lastFontString += 'bold '
      }
      lastFontString += `${convertPt2Px[attrs.size]}px `
      lastFontString += attrs.font
      return lastFontString
    }
  }
})()

const measureTextWidth = (text: string, attrs: { italic: boolean; bold: boolean; size: number; font: string }) => {
  return (40 + (attrs.size - FragmentTextDefaultAttributes.size) * 5) * text.length
}

const measureTextMetrics = (attrs: { bold: boolean; size: number; font: string }) => {
  return {
    baseline: (28 * convertPt2Px[attrs.size]) / 40,
    bottom: (37 * convertPt2Px[attrs.size]) / 40,
    xTop: (23.5 * convertPt2Px[attrs.size]) / 40,
  }
}

const _requestIdleCallback: (cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void) => number =
  (window as any).requestIdleCallback ||
  ((cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void) => {
    return setTimeout(() => {
      const start = Date.now()
      cb({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start))
        },
      })
    }, 1)
  })

const requestIdleCallback: (cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void) => number = (
  cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void,
) => {
  return _requestIdleCallback.call(window, cb)
}

const _cancelIdleCallback: (id: number) => void =
  (window as any).cancelIdleCallback ||
  ((id: number) => {
    clearTimeout(id)
  })

const cancelIdleCallback: (id: number) => void = (id: number) => {
  _cancelIdleCallback.call(window, id)
}

const platform: IPlatform = {
  getPixelRatio,
  convertPt2Px,
  createTextFontString,
  measureTextWidth,
  measureTextMetrics,
  requestIdleCallback,
  cancelIdleCallback,
}

export default platform
