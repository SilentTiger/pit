import Logger from './Log';
import {MessageEnum} from './MessageEnum';

Logger.info('hello');
Logger.error('world');

import Constructor from 'worker-loader!./Constructor';
import Loader from 'worker-loader!./Loader';
const loader = new Loader();
const constructor = new Constructor();

setTimeout(() => {
  constructor.postMessage({ cmd: MessageEnum.startConstruct }); // 启动 constructor
  loader.postMessage({ cmd: MessageEnum.startLoad });           // 启动 loader
}, 2000);

loader.onmessage = (event) => {
  if (event.data.cmd === MessageEnum.LoaderAppend) {
    constructor.postMessage({cmd: MessageEnum.appendConstruct, data: event.data.data}); // 给 constructor 添加数据
  }
  if (event.data.cmd === MessageEnum.LoaderEnd) {
    constructor.postMessage({cmd: MessageEnum.endConstruct, data: event.data.data});    // 通知 constructor 结束
  }
};

constructor.onmessage = (event) => {
  if (event.data.cmd === MessageEnum.ConstructorEnd) {
    console.log('final document data ', event.data);
  }
};
