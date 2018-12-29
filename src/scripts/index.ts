import constructor from './Constructor';
import loader from './Loader';

loader().then((text) => {
  setTimeout(() => {
    console.time('construct');
    constructor.startConstruct();
    text.forEach((lineObject) => {
      constructor.appendConstruct(lineObject);
    });
    console.log(constructor.endConstruct());
    console.timeEnd('construct');
  }, 1000);
});

// pad.quill.getContent().then((text) => console.log(JSON.stringify(showDelta(richdoc.unpack(window.a = text).ops).map((line) => ({...line, attributes: JSON.parse(line.attributes)})))));
