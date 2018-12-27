import Fragment from "./Fragment";

export default class Paragraph {
  public prevSibling: Paragraph;
  public nextSibling: Paragraph;
  public children: Fragment[];
  constructor() {
    this.children = [];
  }
}
