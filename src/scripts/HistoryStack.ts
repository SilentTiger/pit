import EventEmitter from 'eventemitter3'
import Delta from 'quill-delta-enhanced'
import { EventName } from './Common/EnumEventName'
import ICommand from './Common/ICommand'

export class HistoryStack {
  public em: EventEmitter = new EventEmitter();
  public canRedo: boolean = false;
  public canUndo: boolean = false;
  private currentIndex: number = -1;
  private stack: ICommand[] = [];

  /**
   * 添加一条操作
   */
  public push(item: ICommand) {
    this.stack.splice(this.currentIndex + 1)
    this.stack.push(item)
    this.currentIndex = this.stack.length - 1

    this.setRedoUndoStatus()
  }

  /**
   * 获取重做下一步操作的 delta
   */
  public redo(): Delta | null {
    const redoItem = this.stack[this.currentIndex + 1]
    let delta: Delta | null
    if (redoItem) {
      this.currentIndex++
      delta = redoItem.redo
    } else {
      delta = null
    }
    this.setRedoUndoStatus()
    return delta
  }

  /**
   * 获取撤销上一步操作的 delta
   */
  public undo(): Delta | null {
    const undoItem = this.stack[this.currentIndex]
    let delta: Delta | null
    if (undoItem) {
      this.currentIndex--
      delta = undoItem.undo
    } else {
      delta = null
    }
    this.setRedoUndoStatus()
    return delta
  }

  /**
   * 根据远端的 change 来 rebase stack 中所有操作
   * @param change 远端的 change
   */
  public rebase(change: Delta) {
    for (let index = 0; index < this.stack.length; index++) {
      const command = this.stack[index]
      command.redo = change.transform(command.redo)
      command.undo = change.transform(command.undo)
    }
  }

  /**
   * 获取 redo undo 状态
   */
  private setRedoUndoStatus() {
    const newRedo = !!this.stack[this.currentIndex + 1]
    const newUndo = !!this.stack[this.currentIndex]
    if (newRedo !== this.canRedo) {
      this.canRedo = newRedo
    }
    if (newUndo !== this.canUndo) {
      this.canUndo = newUndo
    }
    this.em.emit(EventName.HISTORY_STACK_CHANGE, { canRedo: newRedo, canUndo: newUndo, stackDepth: this.stack.length, current: this.currentIndex })
  }
}
