
import { MessageEnum } from './MessageEnum';
import WorkerAdaptor from './WorkerAdaptor';

const adaptor = new WorkerAdaptor(self as DedicatedWorkerGlobalScope);

adaptor.on(MessageEnum.startConstruct, startConstruct);
adaptor.on(MessageEnum.appendConstruct, appendConstruct);
adaptor.on(MessageEnum.endConstruct, endConstruct);

const documentData: any[] = [];

function startConstruct() {
  documentData.length = 0;
}

function endConstruct() {
  adaptor.send(MessageEnum.ConstrustorEnd, documentData);
  console.log('constructor end ', documentData);
  documentData.length = 0;
}

function appendConstruct(data: any) {
  console.log('constructor append ', data);
}

function parseData(data: any) {

}
