import FragmentTextAttributes from '../DocStructure/FragmentTextAttributes';
export const ctx = document.createElement('canvas').getContext('2d');

export const maxWidth = 616;

export const createTextFontString = (attrs: FragmentTextAttributes): string => {
  let fontString = attrs.italic ? 'italic ' : '';
  fontString += attrs.bold ? 'bold ' : '';
  fontString += convertPt2Px(attrs.size) + 'px ';
  fontString += attrs.font;

  return fontString;
};

export const getTextMetrics = (text: string, attrs: FragmentTextAttributes) => {
  ctx.save();
  ctx.font = createTextFontString(attrs);
  const res = ctx.measureText(text);
  ctx.restore();
  return {
    height: convertPt2Px(attrs.size),
    width: res.width,
  };
};

export const convertPt2Px = (pt: number): number => {
  return [
    null, null, null, null, null, null, 8, 9, 11, 12, 13,
    15, 16, 17, 19, 21, 22, 23, 24, 14, 26, 15, 29,
    17, 32, null, 35, 36, 37, 38, 40, null, 42, null, 45,
    26, 48, 28, 29, null, 30, null, 32, null, null, 34, null,
    null, 36][pt] as number;
};
