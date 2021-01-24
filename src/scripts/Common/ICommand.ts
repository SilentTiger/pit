import Delta from 'quill-delta-enhanced'

export default interface ICommand {
  redo: Delta
  undo: Delta
}
