import Block from "./Block";

export default class Location extends Block {
  public height = 404;

  private name: string = '';
  private address: number = 0;
  private coordinate: number[] = [];
  private id: string = '';
  private zoom: number = 1;
  private url: string = '';

  constructor(
    data: { name: string, address: number, coordinate: number[], id: string, zoom: number, url: string },
  ) {
    super();
    this.name = data.name;
    this.address = data.address;
    this.coordinate = data.coordinate;
    this.id = data.id;
    this.zoom = data.zoom;
    this.url = data.url;
  }

  public layout(): boolean {
    this.needLayout = false;
    return false;
  }

  protected render(ctx: import("../Common/ICanvasContext").default): void {
    throw new Error("Method not implemented.");
  }

}
