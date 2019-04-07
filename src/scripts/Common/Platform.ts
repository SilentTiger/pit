import { IFragmentMetrics } from './IFragmentMetrics';
import { isChinese } from './util';

export function getPixelRatio(context: any): number {
  const backingStore = context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1;

  return (window.devicePixelRatio || 1) / backingStore;
}

export const createTextFontString = (attrs: {italic?: boolean, bold?: boolean, size: number, font: string}): string => {
  let fontString = attrs.italic ? 'italic ' : '';
  fontString += attrs.bold ? 'bold ' : '';
  fontString += convertPt2Px[attrs.size] + 'px ';
  fontString += attrs.font;

  return fontString;
};

export const measureTextWidth = (() => {
  const chineseWidthCache: { [key: string]: number; } = {};
  const spaceWidthCache: { [key: string]: number; } = {};
  const otherWidthCache: { [key: string]: number; } = {};
  const measureCxt = document.createElement('canvas').getContext('2d');

  const getFontStringId = (() => {
    const fontStringCache: { [key: string]: string } = {};
    let fontStringCount = 0;
    return (fontString: string): string => {
      let id = fontStringCache[fontString];
      if (id === undefined) {
        id = (fontStringCount++).toString();
        fontStringCache[fontString] = id;
      }
      return id;
    };
  })();

  return (text: string, attrs: {italic: boolean, bold: boolean, size: number, font: string}) => {
    const fontString = createTextFontString(attrs);
    const fontStringId = getFontStringId(fontString);
    // 如果是空格，尝试从空格宽度缓存中取宽度
    if (text === ' ') {
      let spaceWidth = spaceWidthCache[fontStringId];
      if (spaceWidth === undefined) {
        if (measureCxt.font !== fontString) {measureCxt.font = fontString; }
        spaceWidth = measureCxt.measureText(text).width;
        spaceWidthCache[fontStringId] = spaceWidth;
      }
      return spaceWidth;
    }

    // 如果是单个中文字，尝试从缓存中取文字宽度
    if (text.length === 1 && isChinese(text)) {
      let chineseWidth = chineseWidthCache[fontStringId];
      if (chineseWidth === undefined) {
        if (measureCxt.font !== fontString) {measureCxt.font = fontString; }
        chineseWidth = measureCxt.measureText(text).width;
        chineseWidthCache[fontStringId] = chineseWidth;
      }
      return chineseWidth;
    }

    // 如果是两个中文字，尝试从缓存中取文字宽度
    if (text.length === 2 && isChinese(text[0]) && isChinese(text[1])) {
      let chineseWidth = chineseWidthCache[fontStringId];
      if (chineseWidth === undefined) {
        if (measureCxt.font !== fontString) {measureCxt.font = fontString; }
        chineseWidth = measureCxt.measureText(text[0]).width;
        chineseWidthCache[fontStringId] = chineseWidth;
      }
      return chineseWidth * 2;
    }

    // 如果不是上述两种情况，直接计算宽度
    const otherCacheKey = fontStringId + ' ' + text;
    let textWidth = otherWidthCache[otherCacheKey];
    if (textWidth === undefined) {
      if (measureCxt.font !== fontString) {measureCxt.font = fontString; }
      textWidth = measureCxt.measureText(text).width;
      otherWidthCache[otherCacheKey] = textWidth;
      (window as any).count++;
    }
    return textWidth;
  };
})();

export const convertPt2Px: number[] = (() => {
  const s = document.createElement('span');
  s.style.display = 'none';
  document.body.appendChild(s);
  const map: number[] = new Array(49);
  for (let i = 0; i < map.length; i++) {
    s.style.fontSize = i + 'pt';
    const pxSize = window.getComputedStyle(s).fontSize;
    map[i] = parseFloat(pxSize.substring(0, pxSize.length - 2));
  }
  document.body.removeChild(s);
  console.log(map);
  return map;
})();

export const measureTextMetrics = (() => {
  const metricsCache: {[key: string]: IFragmentMetrics} = {};
  const measureContainer = document.createElement('div');
  measureContainer.style.position = 'absolute';
  measureContainer.style.top = '0';
  measureContainer.style.left = '0';
  measureContainer.style.zIndex = '-1';
  measureContainer.style.pointerEvents = 'none';
  measureContainer.style.lineHeight = 'initial';
  measureContainer.style.opacity = '0';
  const fSpan = document.createElement('span');
  fSpan.textContent = 'f';
  const offsetSpan = document.createElement('span');
  offsetSpan.style.display = 'inline-block';
  measureContainer.appendChild(fSpan);
  measureContainer.appendChild(offsetSpan);
  document.body.appendChild(measureContainer);

  const measureCvs = document.createElement('canvas');
  const measureCtx = measureCvs.getContext('2d');
  const radio = getPixelRatio(measureCtx);
  return (attrs: {bold: boolean, size: number, font: string}) => {
    const cacheKey = attrs.font +  ' ' + attrs.bold + ' ' + attrs.size;
    const cacheValue = metricsCache[cacheKey];
    if (cacheValue !== undefined) {
      return cacheValue;
    }

    measureContainer.style.fontFamily = attrs.font;
    measureContainer.style.fontWeight = attrs.bold ? 'bold' : 'normal';
    measureContainer.style.fontSize = attrs.size + 'pt';

    const bottom = fSpan.offsetHeight;
    const baseline = offsetSpan.offsetTop - fSpan.offsetTop;
    const letterWidth = fSpan.offsetWidth;

    const csvWidth = letterWidth * 2 * radio;
    const cvsHeight = fSpan.offsetHeight * radio;
    measureCvs.width = csvWidth;
    measureCvs.height = cvsHeight;
    measureCtx.scale(radio, radio);
    measureCtx.font = createTextFontString({
      italic: false,
      bold: attrs.bold,
      size: attrs.size,
      font: attrs.font,
    });

    measureCtx.fillStyle = '#FF0000';
    measureCtx.fillText('x', letterWidth, baseline);
    const imageDataX = measureCtx.getImageData(0, 0, csvWidth, cvsHeight).data;
    let xTop = 0;
    for (let i = 0, l = imageDataX.length; i < l; i += 4) {
      if (imageDataX[i] > 0) {
        xTop = i / 4 / csvWidth / radio;
        break;
      }
    }

    const metrics = {
      baseline,
      bottom,
      xTop,
    };
    metricsCache[cacheKey] = metrics;
    return metrics;
  };
})();

export const requestIdleCallback = (window as any).requestIdleCallback ||
  function(cb: (param: { didTimeout: boolean, timeRemaining: () => number }) => void) {
    return setTimeout(() => {
      const start = Date.now();
      cb({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start));
        },
      });
    }, 1);
  };

export const cancelIdleCallback = (window as any).cancelIdleCallback ||
  function(id: number) {
    clearTimeout(id);
  };
