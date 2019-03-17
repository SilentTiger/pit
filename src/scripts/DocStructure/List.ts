import ICanvasContext from "../Common/ICanvasContext";
import { calListItemTitle, calListTypeFromChangeData } from "../Common/util";
import Block from "./Block";
import { EnumListType } from "./EnumListStyle";
import IListAttributes, { ListDefaultAttributes } from "./ListAttributes";
import ListItem from "./ListItem";

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
  private padding = 0;
  constructor(listItems: ListItem[], attrs: any) {
    super();
    this.items = listItems;
    this.setAttributes(attrs);
    this.setItemTitleContent();
  }

  public layout() {
    if (this.needLayout) {
      let currentItem: ListItem;
      for (let i = 0, l = this.items.length; i < l; i++) {
        currentItem = this.items[i];
        currentItem.layout();
        if (i < l - 1) {
          this.items[i + 1].y = Math.floor(currentItem.y + currentItem.height);
        }
        currentItem.x = 20 * currentItem.attributes.indent;
        currentItem.y += this.padding;
      }
      this.needLayout = false;

      this.setSize({ height: currentItem.y + currentItem.height + this.padding });
      if (this.nextSibling !== null) {
        this.nextSibling.setPositionY(Math.floor(this.y + this.height));
      }
    }
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
}
