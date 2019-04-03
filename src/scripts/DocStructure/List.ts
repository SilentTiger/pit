import ICanvasContext from "../Common/ICanvasContext";
import { calListItemTitle, calListTypeFromChangeData } from "../Common/util";
import Block from "./Block";
import { EnumListType } from "./EnumListStyle";
import IListAttributes, { ListDefaultAttributes } from "./ListAttributes";
import ListItem from "./ListItem";
import IDocumentPos from "../Common/IDocumentPos";
import IRectangle from "../Common/IRectangle";

interface IListTreeNode {
  level: number;
  parent: IListTreeNode | null;
  children: IListTreeNode[];
  item: ListItem;
  title: string;
}

export default class List extends Block {
  public items: ListItem[];
  public attributes: IListAttributes = {...ListDefaultAttributes};
  public maxWidth:number = 0;
  private padding = 0;
  constructor(listItems: ListItem[], attrs: any, maxWidth: number) {
    super();
    this.items = listItems;
    this.setAttributes(attrs);
    this.setItemTitleContent();
    this.setItemStart();
    this.length = listItems.reduce((sum: number, f: ListItem) => {
      return sum + f.length;
    }, 0);
    this.maxWidth = maxWidth;
  }

  public layout() {
    if (this.needLayout) {
      let newWidth = 0;
      let currentItem: ListItem;
      for (let i = 0, l = this.items.length; i < l; i++) {
        currentItem = this.items[i];
        currentItem.x = 20 * currentItem.attributes.indent;
        currentItem.maxWidth = this.maxWidth - currentItem.x;
        currentItem.layout();
        if (i < l - 1) {
          this.items[i + 1].y = Math.floor(currentItem.y + currentItem.height);
        }
        currentItem.y += this.padding;
        newWidth = Math.max(newWidth, currentItem.x + currentItem.width);
      }
      this.needLayout = false;

      this.setSize({ height: currentItem.y + currentItem.height + this.padding, width: newWidth });
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(Math.floor(this.y + this.height));
      }
    }
  }

  public getDocumentPos(x: number, y: number): IDocumentPos {
    x = x - this.x;
    y = y - this.y;
    for (let index = 0; index < this.items.length; index++) {
      const item = this.items[index];
      if (
        (item.y <= y && y <= item.y + item.height) ||
        (index === 0 && y < item.y) ||
        (index === this.items.length - 1 && y > item.y + item.height)
      ) {
        const posData = item.getDocumentPos(x - item.x, y - item.y);
        posData.index += item.start;
        posData.PosX += item.x;
        posData.PosYLine += item.y;
        posData.PosYText += item.y;
        return posData;
      }
    }
    return null;
  }

  public getSelectionRectangles(index: number, length: number): IRectangle[] {
    let rects: IRectangle[]=[];
    let offset  = index - this.start;
    let blockLength = offset < 0 ? length + offset : length;
    offset = Math.max(0, offset);
    for (let itemIndex = 0; itemIndex < this.items.length; itemIndex++) {
      const item = this.items[itemIndex];
      if (item.start + item.length <= offset) { continue; }
      if (item.start >= offset + blockLength) { break; }

      const frameOffset = offset - item.start;
      const frameLength = frameOffset < 0 ? blockLength + frameOffset : blockLength;
      const frameRects = item.getSelectionRectangles(Math.max(frameOffset, 0), frameLength);
      for (let rectIndex = 0; rectIndex < frameRects.length; rectIndex++) {
        const rect = frameRects[rectIndex];
        rect.y += this.y;
        rect.x += this.x;
      }
      rects = rects.concat(frameRects);
    }

    return rects;
  }

  protected render(ctx: ICanvasContext, scrollTop: number): void {
    for (let i = 0, l = this.items.length; i < l; i++) {
      const currentItem = this.items[i];
      currentItem.render(ctx, this.x, this.y - scrollTop);
    }
  }

  private setAttributes(attrs: any) {
    this.attributes.listId = attrs['list-id'];
    const listType = attrs.ordered || attrs.bullet;
    this.attributes.type = calListTypeFromChangeData(listType);
  }

  private setItemTitleContent() {
    const root: IListTreeNode = {
      level: 0,
      parent: null,
      children: [],
      item: null,
      title: '',
    };
    let parentNode = root;
    for (let index = 0; index < this.items.length; index++) {
      const element = this.items[index];
      // 如果当前的 item 和 previewNode 之间存在级差，就补齐级差
      while (element.attributes.indent - parentNode.level < 0) {
        parentNode = parentNode.parent;
      }
      while (element.attributes.indent - parentNode.level > 0 && parentNode.children.length > 0) {
        parentNode = parentNode.children[parentNode.children.length - 1];
      }
      while (element.attributes.indent - parentNode.level > 0) {
        const node: IListTreeNode = {
          level: parentNode.level + 1,
          parent: parentNode,
          children: [],
          item: null,
          title: calListItemTitle(
            this.attributes.type,
            parentNode.level + 1,
            parentNode.children.length,
            parentNode.title,
          ),
        };
        parentNode.children.push(node);
        parentNode = node;
      }

      const newNodeTitle = calListItemTitle(
        this.attributes.type,
        element.attributes.indent,
        parentNode.children.length,
        parentNode.title,
      );
      const newNode: IListTreeNode = {
        level: parentNode.level + 1,
        parent: parentNode,
        children: [],
        item: element,
        title: newNodeTitle,
      };
      parentNode.children.push(newNode);
      element.setTitleContent(newNodeTitle);
    }
  }

  private setItemStart() {
    if (this.items.length > 0) {
      this.items[0].start = 0
    } else {
      return;
    }
    for (let index = 1; index < this.items.length; index++) {
      this.items[index].start = this.items[index - 1].start + this.items[index - 1].length;
    }
  }
}
