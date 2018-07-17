import Logger from './Log';

Logger.info('hello');
Logger.error('world');

import Loader from 'worker-loader!./Loader';
const loader = new Loader();

setTimeout(() => {
  console.time('cost');
  loader.postMessage({ cmd: 'start' });
  let count = 0;
  loader.onmessage = (event) => {
    if (event.data.cmd === 'append') {
      count++;
    }
    if (count === 11180) {
      console.timeEnd('cost');
    }
  };
}, 2000);
