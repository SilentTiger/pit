import FragmentTextAttributes from '../DocStructure/FragmentTextAttributes';
import { isChinese } from './util';
export const ctx = document.createElement('canvas').getContext('2d');

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

export const convertPt2Px = [
  null, null, null, null, null, null, 8, 9, 11, 12, 13,
  15, 16, 17, 19, 21, 22, 23, 24, 14, 26, 15, 29,
  17, 32, null, 35, 36, 37, 38, 40, null, 42, null, 45,
  26, 48, 28, 29, null, 30, null, 32, null, null, 34, null,
  null, 36,
];
