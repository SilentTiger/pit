import FragmentTextAttributes from '../DocStructure/FragmentTextAttributes';
export const ctx = document.createElement('canvas').getContext('2d');

export const maxWidth = 500;

export const getTextMetrics = (text: string, attrs: FragmentTextAttributes) => {
  let fontString = attrs.bold ? 'bold ' : '';
  fontString += attrs.italic ? 'italic ' : '';
  fontString += attrs.underline ? 'underline ' : '';
  fontString += attrs.strike ? 'strike ' : '';
  fontString += attrs.size + 'px ';
  fontString += attrs.font;

  ctx.save();
  ctx.font = fontString;
  const res = ctx.measureText(text);
  ctx.restore();
  return {
    height: attrs.size,
    width: res.width,
  };
};
