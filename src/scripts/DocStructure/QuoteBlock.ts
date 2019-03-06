import Block from "./Block";
import Fragment from "./Fragment";

export default class QuoteBlock extends Block {
  constructor(frags: Fragment[]) {
    super();
  }

  public layout(): boolean {
    throw new Error("Method not implemented.");
  }

  protected render(ctx: import("../Common/ICanvasContext").default): void {
    throw new Error("Method not implemented.");
  }
}
