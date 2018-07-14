import WorkerAdaptor from './WorkerAdaptor';

const adaptor = new WorkerAdaptor(self as DedicatedWorkerGlobalScope);
adaptor.on('start', start);

let contentFragment = '';
const decoder = new TextDecoder();

function start() {
  fetch('sample_docs/001.txt', { mode: 'no-cors' })
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
  const contentArray: string[] = contentFragment.split(',\n');
  contentArray.forEach((content, index) => {
    if (index === contentArray.length - 1) {
      contentFragment = contentFragment.substr(contentFragment.length - content.length);
    } else {
      adaptor.send('append', JSON.parse(content));
    }
  });
}

function chunkFinished() {
  adaptor.send('append', JSON.parse(contentFragment));
}
