enum EnumAlign {
  left = 'left',
  center = 'center',
  right = 'right',
  justify = 'justify',
  scattered = 'scattered',
}

const enumLineSpacing = new Map();
enumLineSpacing.set('100', 1.7);
enumLineSpacing.set('115', 2);
enumLineSpacing.set('150', 2.5);
enumLineSpacing.set('200', 3.4);
enumLineSpacing.set('250', 4.3);
enumLineSpacing.set('300', 5.1);

export {EnumAlign, enumLineSpacing as EnumLineSpacing};
