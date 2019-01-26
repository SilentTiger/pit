// ——————————————————————————————————————————————————
// Variables
// ——————————————————————————————————————————————————

let padding: number;
let context: CanvasRenderingContext2D;
let canvas: HTMLCanvasElement;

// ——————————————————————————————————————————————————
// Settings
// ——————————————————————————————————————————————————

const settings = {
  chars: {
    capHeight: 'S',
    baseline: 'n',
    xHeight: 'x',
    descent: 'p',
    ascent: 'h',
    tittle: 'i',
  },
};

// ——————————————————————————————————————————————————
// Methods
// ——————————————————————————————————————————————————

export const initFontMetrics = (ratio: number) => {
  canvas = document.createElement('canvas');
  context = canvas.getContext('2d');
  context.scale(ratio, ratio);
};

const setFont = (fontFamily: string, fontSize: number, fontWeight: string) => {
  padding = fontSize * 0.5;
  canvas.width = fontSize * 2;
  canvas.height = fontSize * 2 + padding;
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  context.textBaseline = 'top';
  context.textAlign = 'center';
};

const setAlignment = (baseline: CanvasTextBaseline = 'top') => {
  const ty = baseline === 'bottom' ? canvas.height : 0;
  context.setTransform(1, 0, 0, 1, 0, ty);
  context.textBaseline = baseline;
};

const updateText = (text: string) => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, padding, canvas.width);
};

const computeLineHeight = (): number => {
  const letter = 'A';
  setAlignment('bottom');
  const gutter = canvas.height - measureBottom(letter);
  setAlignment('top');
  return measureBottom(letter) + gutter;
};

const getPixels = (text: string) => {
  updateText(text);
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
};

const getFirstIndex = (pixels: Uint8ClampedArray) => {
  for (let i = 3, n = pixels.length; i < n; i += 4) {
    if (pixels[i] > 0) { return (i - 3) / 4; }
  }
  return pixels.length;
};

const getLastIndex = (pixels: Uint8ClampedArray) => {
  for (let i = pixels.length - 1; i >= 3; i -= 4) {
    if (pixels[i] > 0) { return i / 4; }
  }
  return 0;
};

const normalize = (metrics: { [key: string]: number }, fontSize: number, origin: CanvasTextBaseline ) => {
  const result: { [key: string]: number } = {};
  const offset = metrics[origin];
  // tslint:disable-next-line:forin
  for (const key in metrics) {
    result[key] = (metrics[key] - offset) / fontSize;
  }
  return result;
};

const measureTop = (text: string): number => (
  Math.round(
    getFirstIndex(
      getPixels(text),
    ) / canvas.width,
  ) - padding
);

const measureBottom = (text: string): number => (
  Math.round(
    getLastIndex(
      getPixels(text),
    ) / canvas.width,
  ) - padding
);

const getMetrics = (chars = settings.chars) => ({
  capHeight: measureTop(chars.capHeight),
  baseline: measureBottom(chars.baseline),
  xHeight: measureTop(chars.xHeight),
  descent: measureBottom(chars.descent),
  bottom: computeLineHeight(),
  ascent: measureTop(chars.ascent),
  tittle: measureTop(chars.tittle),
  top: 0,
});

// ——————————————————————————————————————————————————
// FontMetrics
// ——————————————————————————————————————————————————

export const FontMetrics = ({
  fontFamily = 'Times',
  fontWeight = 'normal',
  fontSize = 200,
  origin = 'baseline',
} = {}) => (
  setFont(fontFamily, fontSize, fontWeight), {
    ...normalize(getMetrics(), fontSize, origin),
    fontFamily,
    fontWeight,
    fontSize,
  }
);

FontMetrics.settings = settings;

// ——————————————————————————————————————————————————
// Exports
// ——————————————————————————————————————————————————
