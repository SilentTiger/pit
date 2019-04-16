import Delta from "quill-delta";

export default class History {
  public delta: Delta;
  public stack: ICommand[] = [];
  public current: number = -1;

  constructor(delta: Delta) {
    this.delta = delta;
  }

  /**
   * 添加一条操作
   */
  public push(redo: Delta, undo: Delta) {
    const command: ICommand = {
      redo,
      undo,
    };
    this.stack.push(command);
    if (this.current === this.stack.length - 2) {
      this.current++;
    }
  }

  /**
   * 获取重做下一步操作的 delta
   */
  public redo(): Delta | null {
    if (this.current < this.stack.length - 2) {
      const res = this.stack[this.current + 1].redo;
      this.current++;
      return res;
    }
    return null;
  }

  /**
   * 获取撤销上一步操作的 delta
   */
  public undo(): Delta | null {
    if (this.current >= 0) {
      const res = this.stack[this.current].undo;
      this.current--;
      return res;
    }
    return null;
  }

  /**
   * 根据远端的 change 来 rebase stack 中所有操作
   * @param change 远端的 change
   */
  public rebase(change: Delta) {
    for (let index = 0; index < this.stack.length; index++) {
      const command = this.stack[index];
      command.redo = change.transform(command.redo);
      command.undo = change.transform(command.undo);
    }
  }
}

export interface ICommand {
  redo: Delta;
  undo: Delta;
}
