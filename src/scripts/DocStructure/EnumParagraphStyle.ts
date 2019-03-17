enum EnumAlign {
  left = 'left',
  center = 'center',
  right = 'right',
  justify = 'justify',
  scattered = 'scattered',
}

const EnumLineSpacing = new Map();
EnumLineSpacing.set('100', 1.7);
EnumLineSpacing.set('115', 2);
EnumLineSpacing.set('150', 2.5);
EnumLineSpacing.set('200', 3.4);
EnumLineSpacing.set('250', 4.3);
EnumLineSpacing.set('300', 5.1);

export {EnumAlign, EnumLineSpacing};
