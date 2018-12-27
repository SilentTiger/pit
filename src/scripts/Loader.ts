/**
 * Loader 负责加载 sample_docs 中的数据文件，同时将数据文件中的字符数据转换成 JSON 数据，并发回给主线程
 * 注意，加载、转换和发送的过程是并行的
 */

import {MessageEnum} from './MessageEnum';
import WorkerAdaptor from './WorkerAdaptor';

const adaptor = new WorkerAdaptor(self as DedicatedWorkerGlobalScope);
adaptor.on(MessageEnum.startLoad, start);

let contentFragment = '';
let decoder = new TextDecoder();

function start() {
  fetch('sample_docs/002.txt', { mode: 'no-cors' })
    .then((res) => consume(res.body.getReader()))
    .catch((e) => console.log("something went wrong: " + e));
}

function consume(reader: ReadableStreamReader) {
  return reader.read().then(function processChunk({ done, value }): Promise<any> {
    if (done) {
      chunkFinished();
      return;
    }
    chunkTemp(value);
    return reader.read().then(processChunk);
  });
}

function chunkTemp(value: Uint8Array) {
  contentFragment += decoder.decode(value, {stream: true});
  const contentArray: string[] = contentFragment.split('\n');
  contentArray.forEach((content, index) => {
    if (index === contentArray.length - 1) {
      contentFragment = contentFragment.substr(contentFragment.length - content.length);
    } else {
      adaptor.send(MessageEnum.LoaderAppend, content);
    }
  });
}

function chunkFinished() {
  adaptor.send(MessageEnum.LoaderEnd, contentFragment);
  // 为以防万一，最后一段数据处理完之后重置存储临时内容的变量和解码器，以免接收到的数据有问题，导致数据有残留
  contentFragment = '';
  decoder = new TextDecoder();
}
