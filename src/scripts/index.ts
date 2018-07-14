import Logger from './Log';

Logger.info('hello');
Logger.error('world');

const loader = new Worker('loader.bundle.js');
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
