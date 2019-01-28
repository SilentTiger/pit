import FragmentTextAttributes from '../DocStructure/FragmentTextAttributes';
import { IFragmentMetrics } from './IFragmentMetrics';
import { isChinese } from './util';

function getPixelRatio(context: any): number {
  const backingStore = context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1;

  return (window.devicePixelRatio || 1) / backingStore;
}

const canvasDom = document.querySelector('canvas');
export const ctx = canvasDom.getContext('2d');
export const pixelRatio = getPixelRatio(ctx);
canvasDom.style.width = canvasDom.width + 'px';
canvasDom.style.height = canvasDom.height + 'px';
if (pixelRatio > 1) {
  canvasDom.width = canvasDom.width * pixelRatio;
  canvasDom.height = canvasDom.height * pixelRatio;
  ctx.scale(pixelRatio, pixelRatio);
}

export const maxWidth = 616;

export const createTextFontString = (attrs: FragmentTextAttributes): string => {
  let fontString = attrs.italic ? 'italic ' : '';
  fontString += attrs.bold ? 'bold ' : '';
  fontString += convertPt2Px[attrs.size] + 'px ';
  fontString += attrs.font;

  return fontString;
};

const chineseWidthCache = new Map<string, number>();
const spaceWidthCache = new Map<string, number>();
export const measureTextWidth = (text: string, attrs: FragmentTextAttributes) => {
  const fontString = createTextFontString(attrs);
  // 如果是空格，尝试从空格宽度缓存中取宽度
  if (text === ' ') {
    let spaceWidth = spaceWidthCache.get(fontString);
    if (spaceWidth === undefined) {
      ctx.save();
      ctx.font = fontString;
      spaceWidth = ctx.measureText(text).width;
      ctx.restore();
      spaceWidthCache.set(fontString, spaceWidth);
    }
    return spaceWidth;
  }

  // 如果是单个中文字，尝试从缓存中取文字宽度
  if (text.length === 1 && isChinese(text)) {
    let chineseWidth = chineseWidthCache.get(fontString);
    if (chineseWidth === undefined) {
      ctx.save();
      ctx.font = fontString;
      chineseWidth = ctx.measureText(text).width;
      ctx.restore();
      chineseWidthCache.set(fontString, chineseWidth);
    }
    return chineseWidth;
  }
  // 如果不是上述两种情况，直接计算宽度
  ctx.save();
  ctx.font = fontString;
  const textWidth = ctx.measureText(text).width;
  ctx.restore();
  return textWidth;
};

export const measureTextMetrics = (() => {
  const metricsCache = new Map<string, IFragmentMetrics>();
  const fontSize = 200;
  const measureContainer = document.createElement('div');
  measureContainer.style.position = 'absolute';
  measureContainer.style.top = '0';
  measureContainer.style.left = '0';  measureContainer.style.zIndex = '-1';
  measureContainer.style.pointerEvents = 'none';
  measureContainer.style.lineHeight = 'initial';
  measureContainer.style.fontSize = '100px';
  measureContainer.style.opacity = '0.1';
  const fSpan = document.createElement('span');
  fSpan.textContent = 'f';
  const offsetSpan = document.createElement('span');
  offsetSpan.style.display = 'inline-block';
  measureContainer.appendChild(fSpan);
  measureContainer.appendChild(offsetSpan);
  document.body.appendChild(measureContainer);
  return (attrs: FragmentTextAttributes) => {
    const cacheKey = `${attrs.font} ${attrs.bold}`;
    const cacheValue = metricsCache.get(cacheKey);
    if (cacheValue !== undefined) {
      return cacheValue;
    }

    measureContainer.style.fontFamily = attrs.font;
    measureContainer.style.fontWeight = attrs.bold ? 'bold' : 'normal';
    const baselinePosY = offsetSpan.offsetTop;
    const totalHeight = fSpan.offsetHeight;

    const metrics = {
      baseline: baselinePosY / totalHeight,
      bottom: totalHeight / fontSize,
      emTop: (1 - fontSize / totalHeight) * baselinePosY / fontSize,
      emBottom: (1 - fontSize / totalHeight) * (totalHeight - baselinePosY) / fontSize,
    };
    metricsCache.set(cacheKey, metrics);
    return metrics;
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
