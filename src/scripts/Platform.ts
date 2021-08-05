import type ICanvasContext from './Common/ICanvasContext'

export interface IPlatform {
  getPixelRatio: (context: ICanvasContext) => number
  convertPt2Px: number[]
  createTextFontString: (attrs: { italic?: boolean; bold?: boolean; size: number; font: string }) => string
  measureTextWidth: (text: string, attrs: { italic: boolean; bold: boolean; size: number; font: string }) => number
  measureTextMetrics: (attrs: {
    bold: boolean
    size: number
    font: string
  }) => {
    baseline: number
    bottom: number
    xTop: number
  }
  requestIdleCallback: (cb: (param: { didTimeout: boolean; timeRemaining: () => number }) => void) => number
  cancelIdleCallback: (id: number) => void
}

const defaultPlatform: IPlatform = {
  getPixelRatio: () => {
    return 1
  },
  convertPt2Px: [],
  createTextFontString: () => '',
  measureTextWidth: () => 0,
  measureTextMetrics: () => ({
    baseline: 11,
    bottom: 11,
    xTop: 11,
  }),
  requestIdleCallback: () => 0,
  cancelIdleCallback: () => {
    /** */
  },
}

let _: IPlatform = defaultPlatform

export const initPlatform = (platform: IPlatform) => {
  _ = platform
}

export const getPlatform = () => {
  return _
}
