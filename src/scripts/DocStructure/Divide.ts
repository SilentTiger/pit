import Block from "./Block";

export default class Divide extends Block {
  public height = 45;

  public layout(): boolean {
    this.needLayout = false;
    return false;
  }

  protected render(ctx: import("../Common/ICanvasContext").default): void {
    throw new Error("Method not implemented.");
  }

}
