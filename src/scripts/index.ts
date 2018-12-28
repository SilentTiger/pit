import constructor from './Constructor';
import loader from './Loader';

loader().then((text) => {
  constructor.startConstruct();
  text.forEach((lineObject) => {
    constructor.appendConstruct(lineObject);
  });
  console.log('construct data ', constructor.endConstruct());
});
