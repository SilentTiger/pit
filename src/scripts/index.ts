import Document from './DocStructure/Document';
import loader from './Loader';

loader().then((text) => {
  setTimeout(() => {
    console.time('construct');
    const doc = new Document();
    text.forEach((lineObject) => {
      doc.appendDelta(lineObject);
    });
    console.log(doc);
    console.timeEnd('construct');
  }, 1000);
});

// pad.quill.getContent().then((text) => console.log(JSON.stringify(showDelta(richdoc.unpack(window.a = text).ops).map((line) => ({...line, attributes: JSON.parse(line.attributes)})))));
