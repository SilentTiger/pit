import Delta from 'quill-delta-enhanced'
import Editor from './Editor'
import IEditorConfig from './IEditorConfig'
import loader from './Loader'
import Paragraph from './Block/Paragraph'
import ListItem from './Block/ListItem'
import QuoteBlock from './Block/QuoteBlock'
import FragmentParaEnd from './Fragment/FragmentParaEnd'
import FragmentText from './Fragment/FragmentText'
import FragmentDate from './Fragment/FragmentDate'
import FragmentImage from './Fragment/FragmentImage'
import Table from './Block/Table'
import CodeBlock from './Block/CodeBlock'
import browserPlatform from './Common/Platform.browser'
import { initPlatform } from './Platform'
import { bind, mapRunToFragment } from './Common/IoC'
import LayoutFrame from './RenderStructure/LayoutFrame'
import RunText from './RenderStructure/RunText'
import RunParaEnd from './RenderStructure/RunParaEnd'
import RunDate from './RenderStructure/RunDate'
import RunImage from './RenderStructure/RunImage'

let fileName: string
;(() => {
  // 初始化文件选择器
  const getUrlParameter = (name: string) => {
    const regex = new RegExp(`[\\?&]${name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]')}=([^&#]*)`)
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
    location.href = `${location.origin + location.pathname}?file=${fileSelect.value}`
  })
  fileName += '.qde'
})()

// 初始化 Platform
initPlatform(browserPlatform)

// 在 IoC 中注册 各种 Block
bind(Paragraph.typeName, Paragraph)
bind(ListItem.typeName, ListItem)
bind(QuoteBlock.typeName, QuoteBlock)
bind(Table.typeName, Table)
bind(CodeBlock.typeName, CodeBlock)
// 在 IoC 中注册 各种 Fragment
bind(FragmentText.typeName, FragmentText)
bind(FragmentParaEnd.typeName, FragmentParaEnd)
bind(FragmentDate.typeName, FragmentDate)
bind(FragmentImage.typeName, FragmentImage)
// 在 IoC 中注册 LayoutFrame
bind(LayoutFrame.typeName, LayoutFrame)
// 在 IoC 中注册各种 Run
bind(RunText.typeName, RunText)
bind(RunParaEnd.typeName, RunParaEnd)
bind(RunDate.typeName, RunDate)
bind(RunImage.typeName, RunImage)

mapRunToFragment(FragmentText.typeName, RunText.typeName)
mapRunToFragment(FragmentParaEnd.typeName, RunParaEnd.typeName)
mapRunToFragment(FragmentDate.typeName, RunDate.typeName)
mapRunToFragment(FragmentImage.typeName, RunImage.typeName)

const editor = new Editor(document.querySelector('#divEditor') as HTMLDivElement, IEditorConfig)

;(() => {
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
  w.showDelta = (index = 0) => {
    const delta = (editor as any).history.stack[index]
    console.log('redo: ', delta.redo.ops)
    console.log('undo: ', delta.undo.ops)
  }
})()

loader(fileName).then((delta: Delta) => {
  ;(window as any).start = performance.now()
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
