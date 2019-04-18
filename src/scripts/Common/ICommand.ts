import Delta from "quill-delta";

export default interface ICommand {
  redo: Delta;
  undo: Delta;
}
