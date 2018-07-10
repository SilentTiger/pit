/**
 * WebWorker 适配器，用来接收其他线程发来的消息
 * 分析消息类型，过滤不合法消息，并提供依据消息类型的事件监听接口
 * 提供像宿主线程发送消息的接口
 */
export default class WorkerAdaptor {
  /**
   * 当前线程的上下文对象
   */
  private scope: DedicatedWorkerGlobalScope;
  /**
   * 存储事件回调的数据结构
   */
  private callback: Map<string, Array<(data: any, event?: MessageEvent) => any>>;
  constructor(scope: DedicatedWorkerGlobalScope) {
    this.callback = new Map();
    this.scope = scope;
    this.scope.addEventListener('message', (event) => {
      if (!event.data || !event.data.cmd || !this.callback.get(event.data.cmd)) { return; }
      const listeners = this.callback.get(event.data.cmd);
      listeners.forEach((listener) => {
        listener.call(this, event.data, event);
      });
    });
  }

  /**
   * 添加对某一消息类型进行监听的回调函数
   * 如果同一回调函数被添加多次，则相应事件触发时该回调函数也会被多次调用
   * @param cmd 消息类型
   * @param callback 回调函数
   */
  public on(cmd: string, callback: (data: any, event?: MessageEvent) => any): WorkerAdaptor {
    const listeners = this.callback.get(cmd);
    if (!listeners) {
      this.callback.set(cmd, [callback]);
    } else {
      listeners.push(callback);
    }
    return this;
  }

  /**
   * 去除对某一消息类型进行监听的回调函数
   * 对于被多次添加的回调函数需要多次去除才能被完全去除掉
   * @param cmd 消息类型
   * @param callback 回调函数
   */
  public off(cmd: string, callback: (data: any, event?: MessageEvent) => any): WorkerAdaptor {
    const listeners = this.callback.get(cmd);
    if (listeners) {
      for (let i = listeners.length - 1; i >= 0; i--) {
        if (listeners[i] === callback) {
          listeners.splice(i, 1);
          break;
        }
      }
    }
    return this;
  }

  /**
   * 去除监听某一消息类型的所有回调函数
   * @param cmd 消息类型
   */
  public offAll(cmd: string): WorkerAdaptor {
    let listeners = this.callback.get(cmd);
    if (listeners) {
      listeners = [];
    }
    return this;
  }

  /**
   * 向宿主线程发送消息
   * @param cmd 消息类型
   * @param data 需要发送的数据
   * @param transfer 是否以 transfer 方式发送数据
   */
  public send(cmd: string, data: any, transfer: boolean = false) {
    const messageObj = {
      cmd,
      data,
    };
    this.scope.postMessage(messageObj, transfer ? [messageObj] : undefined);
  }
}
