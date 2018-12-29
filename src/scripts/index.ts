import constructor from './Constructor';
import loader from './Loader';

loader().then((text) => {
  constructor.startConstruct();
  text.forEach((lineObject) => {
    constructor.appendConstruct(lineObject);
  });
  console.log('construct data ', constructor.endConstruct());
});

// pad.quill.getContent().then((text) => console.log(JSON.stringify(showDelta(richdoc.unpack(window.a = text).ops).map((line) => ({...line, attributes: JSON.parse(line.attributes)})))));
