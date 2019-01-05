import Document from './DocStructure/Document';
import loader from './Loader';
import Root from './RenderStructure/Root';

loader().then((text) => {
  setTimeout(() => {
    console.time('construct');
    const doc = new Document();
    text.forEach((lineObject) => {
      doc.appendDelta(lineObject);
    });
    console.timeEnd('construct');
    console.log(doc);

    console.time('layout');
    const root = new Root(doc, 0, 0);
    console.timeEnd('layout');
    console.log(root);

    console.time('draw');
    root.draw(document.querySelector('canvas').getContext('2d'));
    console.timeEnd('draw');
  }, 1000);
});

// pad.quill.getContent().then((text) => console.log(JSON.stringify(showDelta(richdoc.unpack(window.a = text).ops).map((line) => ({...line, attributes: JSON.parse(line.attributes)})))));
