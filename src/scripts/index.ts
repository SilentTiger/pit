import Delta from 'quill-delta'
import Editor from './Editor'
import IEditorConfig from './IEditorConfig'
import loader from './Loader'
import initToolbar from './toolbar'

let fileName: string;

(() => {
  // 初始化文件选择器
  const getUrlParameter = (name: string) => {
    name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)')
    const results = regex.exec(location.search)
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '))
  }
  const fileSelect = document.querySelector('#selFileName') as HTMLSelectElement
  fileName = getUrlParameter('file')
  if (fileName.length === 0) {
    fileName = fileSelect.value
  } else {
    fileSelect.value = fileName
  }
  fileSelect.addEventListener('change', (event) => {
    console.log('file change ', event)
    location.href = location.origin + location.pathname + '?file=' + fileSelect.value
  })
  fileName += '.txt'
})()

const editor = new Editor(document.querySelector('#divEditor') as HTMLDivElement, IEditorConfig)

initToolbar(document.querySelector('#toolbar') as HTMLDivElement, editor);

(() => {
  const w: any = window
  w.hit = 0
  w.cal = 0
  w.count = 0
  w.total = 0
  w.c = []
  w.editor = editor
  // w.lineBorder = true
  // w.runBorder = true
  // w.frameBorder = true
  // w.blockBorder = true
  w.Delta = Delta
  w.showDelta = (index: number = 0) => {
    const delta = (editor as any).history.stack[index]
    console.log('redo: ', delta.redo.ops)
    console.log('undo: ', delta.undo.ops)
  }
})()

loader(fileName).then((delta: Delta) => {
  (window as any).start = performance.now()
  editor.readFromChanges(delta)
})

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
