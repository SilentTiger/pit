export default class LineBreaker {
  constructor(text: string);
  nextBreak(): null | { position: number, required: boolean }
}