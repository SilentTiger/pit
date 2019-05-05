import Delta from 'quill-delta';
import Editor from './Editor';
import IEditorConfig from './IEditorConfig';
import loader from './Loader';

console.log('start ', performance.now());
const editor = new Editor(document.querySelector('#divEditor') as HTMLDivElement, IEditorConfig);

(() => {
  const w: any = window;
  w.hit = 0;
  w.cal = 0;
  w.count = 0;
  w.total = 0;
  w.c = {};
  w.editor = editor;
  // w.lineBorder = true;
  // w.runBorder = true;
  // w.frameBorder = true;
  // w.blockBorder = true;
  w.Delta = Delta;
})();

loader().then((delta: Delta) => {
  editor.readFromChanges(delta);
});

// function delta2json(delta) {
//   return delta.ops.map((op) => {
//     const opJson = {};
//     if (op.attributes) {
//       opJson.attributes = op.getAttributes();
//     }

//     opJson.action = op.action;
//     opJson.data = {};

//     if (op.data.cells) {
//       opJson.data.cells = {};
//       op.data.cells.forEach((cellName) => {
//         const cell = op.data.cells.get(cellName);
//         opJson.data.cells[cellName] = {
//           action: cell.action,
//           attributes: cell.getAttributes(),
//           data: delta2json(cell.data),
//         };
//       });

//       opJson.data.cols = delta2json(op.data.cols);
//       opJson.data.rows = delta2json(op.data.rows);
//     } else {
//       opJson.data = op.data;
//     }
//     return opJson;
//   });
// }
// pad.quill.getContent().then((text) => {
//   console.log(JSON.stringify(delta2json(richdoc.unpack(text)).map((richDocDelta) => {
//     return {
//       [richDocDelta.action]: richDocDelta.data,
//       attributes: richDocDelta.attributes
//     }
//   })));
// });
