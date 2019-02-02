import Document from './DocStructure/Document';
import Editor from './Editor';
import loader from './Loader';

// const editor = new Editor(document.querySelector('#divEditor'), {
//   containerWidth: 646,
//   containerHeight: 780,
// });

(() => {
  const w: any = window;
  w.hit = 0;
  w.cal = 0;
  // w.editor = editor;
})();

loader().then((text) => {
  // editor.setDeltas(text);
  setTimeout(() => {
    console.time('construct');
    const doc = new Document();
    doc.readFromChanges(text);
    console.timeEnd('construct');
    console.log(doc);

    // console.time('layout');
    // const root = new Root(doc, 0, 0);
    // console.timeEnd('layout');
    // console.log(root);

    // console.time('draw');
    // root.draw(ctx);
    // console.timeEnd('draw');
  }, 1000);
});

// function showDelta(delta) {
//   if (typeof delta === 'undefined') {
//     delta = richdoc.unpack(cow.currentFile.content)
//   } else if (typeof delta === 'string') {
//     delta = richdoc.unpack(delta)
//   } else if (typeof delta === 'object') {
//     if (Array.isArray(delta)) {
//       delta = richdoc.unpack(JSON.stringify(delta))
//     }
//   }
//   let result = []
//   if (delta.ops) {
//     result = delta.ops.map(op => ({
//       action: op.action,
//       data: op.data,
//       attributes: JSON.stringify(op.getAttributes())
//     }))
//   }
//   return result
// }
// pad.quill.getContent().then((text) => console.log(JSON.stringify(showDelta(richdoc.unpack(text).ops).map((line) => ({...line, attributes: JSON.parse(line.attributes)})))));
