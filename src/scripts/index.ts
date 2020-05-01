import Delta from 'quill-delta-enhanced'
import Editor from './Editor'
import IEditorConfig from './IEditorConfig'
import loader from './Loader'
import initToolbar from './toolbar'
import Paragraph from './DocStructure/Paragraph'
import ListItem from './DocStructure/ListItem'
import QuoteBlock from './DocStructure/QuoteBlock'
import FragmentParaEnd from './DocStructure/FragmentParaEnd'
import StructureRegistrar from './StructureRegistrar'
import FragmentText from './DocStructure/FragmentText'
import FragmentDate from './DocStructure/FragmentDate'
import FragmentImage from './DocStructure/FragmentImage'
import Table from './DocStructure/Table'

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
  fileName += '.json'
})()

// 在 StructureRegistrar 中注册 各种 Block
StructureRegistrar.registerBlock(Paragraph.blockType, Paragraph)
StructureRegistrar.registerBlock(ListItem.blockType, ListItem)
StructureRegistrar.registerBlock(QuoteBlock.blockType, QuoteBlock)
StructureRegistrar.registerBlock(Table.blockType, Table)

StructureRegistrar.registerFragment(FragmentText.fragType, FragmentText)
StructureRegistrar.registerFragment(FragmentParaEnd.fragType, FragmentParaEnd)
StructureRegistrar.registerFragment(FragmentDate.fragType, FragmentDate)
StructureRegistrar.registerFragment(FragmentImage.fragType, FragmentImage)

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
  w.s = JSON.stringify
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

const doc = new Delta()
const tableDelta = new Delta()
const r1 = new Delta()
const r2 = new Delta()
const r3 = new Delta()
const r4 = new Delta()
const c1 = new Delta()
  .insert('cell 1 line 1').insert(1, { frag: 'end', block: 'para' })
  .insert('cell 1 line 2').insert(1, { frag: 'end', block: 'para' })
  .insert('cell 1 line 3').insert(1, { frag: 'end', block: 'para' })
  .insert('cell 1 line 4').insert(1, { frag: 'end', block: 'para' })
const c2 = new Delta().insert('cell 2').insert(1, { frag: 'end', block: 'para' })
const c3 = new Delta()
  .insert('cell 3 line 1').insert(1, { frag: 'end', block: 'para' })
  .insert('cell 3 line 2').insert(1, { frag: 'end', block: 'para' })
const c4 = new Delta().insert('cell 4').insert(1, { frag: 'end', block: 'para' })
const c5 = new Delta().insert('cell 5').insert(1, { frag: 'end', block: 'para' })
const c6 = new Delta().insert('cell 6').insert(1, { frag: 'end', block: 'para' })
const c7 = new Delta().insert('cell 7').insert(1, { frag: 'end', block: 'para' })
const c8 = new Delta().insert('cell 8').insert(1, { frag: 'end', block: 'para' })
const c9 = new Delta().insert('cell 9').insert(1, { frag: 'end', block: 'para' })
const c10 = new Delta().insert('cell 10').insert(1, { frag: 'end', block: 'para' })

r1.insert(c1, { colSpan: 2, rowSpan: 4 })
r1.insert(c2, { colSpan: 3 })
r2.insert(c3, { rowSpan: 2 })
r2.insert(c4)
r2.insert(c5)
r3.insert(c6)
r3.insert(c7)
r4.insert(c8)
r4.insert(c9)
r4.insert(c10)
tableDelta.insert(r1).insert(r2).insert(r3).insert(r4)
doc.insert(tableDelta, { block: 'table', colWidth: [100, 100, 100, 100, 186] })

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
