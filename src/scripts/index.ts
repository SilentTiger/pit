import * as opentype from 'opentype.js';

opentype.load('', (err, font) => {
  console.log(font);
});
