import Block from "./Block";
import LayoutFrame from "./LayoutFrame";

export default class QuoteBlock extends Block {
  constructor(frames: LayoutFrame[]) {
    super();
  }

  public layout(): boolean {
    throw new Error("Method not implemented.");
  }

  protected render(ctx: import("../Common/ICanvasContext").default): void {
    throw new Error("Method not implemented.");
  }
}
