import Editor from './Editor';
import EditorConfig from './EditorConfig';
import Logger from './Log';
Logger.info('hello world info');

const config = new EditorConfig(800, 400, 800, 400);
const editor = new Editor(document.getElementById('divEditor') as HTMLDivElement, config);

const loader = new Worker('loader.bundle.js');
loader.onmessage = (msg) => {console.log(msg); };
loader.postMessage({cmd: 'start', data: 1});
loader.postMessage({cmd: 'end', data: 1});
loader.postMessage({cmd: 'start', data: 1});
