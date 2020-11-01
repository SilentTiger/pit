import { FragmentTextDefaultAttributes } from '../src/scripts/DocStructure/FragmentTextAttributes'
import { IPlatform } from '../src/scripts/Platform'

const getPixelRatio = (context: any): number => 2

const convertPt2Px: number[] = [0, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13.3333, 14.6667, 16, 17.3333, 18.6667, 20, 21.3333, 22.6667, 24, 25.3333, 26.6667, 28, 29.3333, 30.6667, 32, 33.3333, 34.6667, 36, 37.3333, 38.6667, 40, 41.3333, 42.6667, 44, 45.3333, 46.6667, 48, 49.3333, 50.6667, 52, 53.3333, 54.6667, 56, 57.3333, 58.6667, 60, 61.3333, 62.6667, 64]

const createTextFontString = (() => {
  let lastAttrs: any = null
  let lastFontString: string = ''
  return (attrs: { italic?: boolean, bold?: boolean, size: number, font: string }): string => {
    if (attrs === lastAttrs) {
      return lastFontString
    } else if (
      lastAttrs &&
      lastAttrs.italic === attrs.italic && lastAttrs.bold === attrs.bold &&
      lastAttrs.size === attrs.size && lastAttrs.font === attrs.font
    ) {
      lastAttrs = attrs
      return lastFontString
    } else {
      lastAttrs = attrs
      lastFontString = attrs.italic ? 'italic ' : ''
      if (attrs.bold) {
        lastFontString += 'bold '
      }
      lastFontString += convertPt2Px[attrs.size] + 'px '
      lastFontString += attrs.font
      return lastFontString
    }
  }
})()

const measureTextWidth = (text: string, attrs: { italic: boolean, bold: boolean, size: number, font: string }) => {
  return (40 + (attrs.size - FragmentTextDefaultAttributes.size) * 5) * text.length
}

const measureTextMetrics = (attrs: { bold: boolean, size: number, font: string }) => {
  return {
    baseline: 28 * convertPt2Px[attrs.size] / 40,
    bottom: 37 * convertPt2Px[attrs.size] / 40,
    xTop: 23.5 * convertPt2Px[attrs.size] / 40,
  }
}

const _requestIdleCallback: (cb: (param: { didTimeout: boolean, timeRemaining: () => number }) => void) => number =
  (window as any).requestIdleCallback ||
  ((cb: (param: { didTimeout: boolean, timeRemaining: () => number }) => void) => {
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

const requestIdleCallback: (cb: (param: { didTimeout: boolean, timeRemaining: () => number }) => void) => number =
  (cb: (param: { didTimeout: boolean, timeRemaining: () => number }) => void) => {
    return _requestIdleCallback.call(window, cb)
  }

const _cancelIdleCallback: (id: number) => void = (window as any).cancelIdleCallback ||
  (
    (id: number) => {
      clearTimeout(id)
    }
  )

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
