import type { IPlatform } from '../Platform'
import type { IFragmentMetrics } from './IFragmentMetrics'
import { isChinese } from './util'

const getPixelRatio = (context: any): number => {
  const backingStore =
    context.backingStorePixelRatio ||
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio ||
    1

  return (window.devicePixelRatio || 1) / backingStore
}

const convertPt2Px: number[] = (() => {
  const s = document.createElement('span')
  s.style.display = 'none'
  document.body.appendChild(s)
  const map: number[] = new Array(49)
  for (let i = 0; i < map.length; i++) {
    s.style.fontSize = `${i  }pt`
    const pxSize = window.getComputedStyle(s).fontSize as string
    map[i] = parseFloat(pxSize.substring(0, pxSize.length - 2))
  }
  document.body.removeChild(s)
  return map
})()

const createTextFontString = (() => {
  let lastAttrs: any = null
  let lastFontString = ''
  return (attrs: { italic?: boolean; bold?: boolean; size: number; font: string }): string => {
    if (
      lastAttrs &&
      lastAttrs.italic === attrs.italic &&
      lastAttrs.bold === attrs.bold &&
      lastAttrs.size === attrs.size &&
      lastAttrs.font === attrs.font
    ) {
      lastAttrs = attrs
      return lastFontString
    } else {
      lastAttrs = { ...attrs }
      lastFontString = attrs.italic ? 'italic ' : ''
      if (attrs.bold) {
        lastFontString += 'bold '
      }
      lastFontString += `${attrs.size  }pt `
      lastFontString += attrs.font
      return lastFontString
    }
  }
})()

const measureTextWidth = (() => {
  const chineseWidthCache: { [key: string]: number } = {}
  const spaceWidthCache: { [key: string]: number } = {}
  const otherWidthCache: { [key: string]: number } = {}
  const measureCxt = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D

  const getFontStringId = (() => {
    const fontStringCache: { [key: string]: string } = {}
    let fontStringCount = 0
    return (fontString: string): string => {
      let id = fontStringCache[fontString]
      if (id === undefined) {
        id = (fontStringCount++).toString()
        fontStringCache[fontString] = id
      }
      return id
    }
  })()

  return (text: string, attrs: { italic: boolean; bold: boolean; size: number; font: string }) => {
    const fontString = createTextFontString(attrs)
    const fontStringId = getFontStringId(fontString)
    // 如果是空格，尝试从空格宽度缓存中取宽度
    if (text === ' ') {
      let spaceWidth = spaceWidthCache[fontStringId]
      if (spaceWidth === undefined) {
        measureCxt.font = fontString
        spaceWidth = measureCxt.measureText(text).width
        spaceWidthCache[fontStringId] = spaceWidth
      }
      return spaceWidth
    }

    // 如果是单个中文字，尝试从缓存中取文字宽度
    if (text.length === 1 && isChinese(text)) {
      let chineseWidth = chineseWidthCache[fontStringId]
      if (chineseWidth === undefined) {
        measureCxt.font = fontString
        chineseWidth = measureCxt.measureText(text).width
        chineseWidthCache[fontStringId] = chineseWidth
      }
      return chineseWidth
    }

    // 如果是两个中文字，尝试从缓存中取文字宽度
    if (text.length === 2 && isChinese(text[0]) && isChinese(text[1])) {
      let chineseWidth = chineseWidthCache[fontStringId]
      if (chineseWidth === undefined) {
        measureCxt.font = fontString
        chineseWidth = measureCxt.measureText(text[0]).width
        chineseWidthCache[fontStringId] = chineseWidth
      }
      return chineseWidth * 2
    }

    // 如果不是上述两种情况，直接计算宽度
    const otherCacheKey = `${fontStringId  } ${  text}`
    let textWidth = otherWidthCache[otherCacheKey]
    if (textWidth === undefined) {
      measureCxt.font = fontString
      textWidth = measureCxt.measureText(text).width
      otherWidthCache[otherCacheKey] = textWidth
    }
    return textWidth
  }
})()

const measureTextMetrics = (() => {
  const metricsCache: { [key: string]: IFragmentMetrics } = {}
  const measureContainer = document.createElement('div')
  measureContainer.style.position = 'absolute'
  measureContainer.style.top = '0'
  measureContainer.style.left = '0'
  measureContainer.style.zIndex = '-1'
  measureContainer.style.pointerEvents = 'none'
  measureContainer.style.lineHeight = 'initial'
  measureContainer.style.opacity = '0'
  const fSpan = document.createElement('span')
  fSpan.textContent = 'f'
  const offsetSpan = document.createElement('span')
  offsetSpan.style.display = 'inline-block'
  measureContainer.appendChild(fSpan)
  measureContainer.appendChild(offsetSpan)
  document.body.appendChild(measureContainer)

  const measureCvs = document.createElement('canvas')
  const measureCtx = measureCvs.getContext('2d') as CanvasRenderingContext2D
  const radio = getPixelRatio(measureCtx)
  return (attrs: { bold: boolean; size: number; font: string }) => {
    const cacheKey = `${attrs.font  } ${  attrs.bold  } ${  attrs.size}`
    const cacheValue = metricsCache[cacheKey]
    if (cacheValue !== undefined) {
      return { ...cacheValue }
    }

    measureContainer.style.fontFamily = attrs.font
    measureContainer.style.fontWeight = attrs.bold ? 'bold' : 'normal'
    measureContainer.style.fontSize = `${attrs.size  }pt`

    const bottom = fSpan.offsetHeight
    const baseline = offsetSpan.offsetTop - fSpan.offsetTop
    const letterWidth = fSpan.offsetWidth

    const csvWidth = letterWidth * 2 * radio
    const cvsHeight = fSpan.offsetHeight * radio
    measureCvs.width = csvWidth
    measureCvs.height = cvsHeight
    measureCtx.scale(radio, radio)
    measureCtx.font = createTextFontString(attrs)

    measureCtx.fillStyle = '#FF0000'
    measureCtx.fillText('x', letterWidth, baseline)
    const imageDataX = measureCtx.getImageData(0, 0, csvWidth, cvsHeight).data
    let xTop = 0
    for (let i = 0, l = imageDataX.length; i < l; i += 4) {
      if (imageDataX[i] > 0) {
        xTop = i / 4 / csvWidth / radio
        break
      }
    }

    const metrics = {
      baseline,
      bottom,
      xTop,
    }
    metricsCache[cacheKey] = metrics
    return metrics
  }
})()

const _requestIdleCallback: (cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void) => number =
  (window as any).requestIdleCallback ||
  ((cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void) => {
    return setTimeout(() => {
      const start = Date.now()
      const param = {
        didTimeout: false,
        timeRemaining: () => {
          return Math.max(0, 50 - (Date.now() - start))
        },
      }
      cb(param)
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
