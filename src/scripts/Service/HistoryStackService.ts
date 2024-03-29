import Delta from 'quill-delta-enhanced'
import { EventName } from '../Common/EnumEventName'
import type ICommand from '../Common/ICommand'
import Service from './Service'

export class HistoryStackService extends Service {
  public canRedo = false
  public canUndo = false
  private delta: Delta | null = null
  private currentIndex = -1
  private stack: ICommand[] = []
  private compositing = false
  private compositionStack: ICommand[] = []

  public setInitDelta(delta: Delta) {
    this.delta = delta
  }

  public pushDiff(diff: Delta) {
    if (this.delta && diff && diff.ops.length > 0) {
      const command: ICommand = {
        redo: diff,
        undo: diff.invert(this.delta),
      }
      if (this.compositing) {
        this.compositionStack.push(command)
      } else {
        this.stack.splice(this.currentIndex + 1)
        this.stack.push(command)
        this.currentIndex = this.stack.length - 1
        this.setRedoUndoStatus()
        this.delta = this.delta.compose(diff)
      }
    }
  }

  public startComposition() {
    this.compositing = true
  }

  public endComposition() {
    this.compositing = false
    if (this.delta && this.compositionStack.length > 0) {
      let redo = new Delta()
      let undo = new Delta()
      this.compositionStack.forEach((item) => {
        redo = redo.compose(item.redo)
        undo = undo.compose(item.undo)
      })
      this.compositionStack.length = 0
      this.stack.splice(this.currentIndex + 1)
      this.stack.push({ redo, undo })
      this.currentIndex = this.stack.length - 1
      this.setRedoUndoStatus()
      this.delta = this.delta.compose(redo)
    }
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
    this.emit(EventName.HISTORY_STACK_CHANGE, {
      canRedo: newRedo,
      canUndo: newUndo,
      stackDepth: this.stack.length,
      current: this.currentIndex,
    })
  }
}
