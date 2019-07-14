/**
 * 链式列表泛型类，提供了基本的链式列表操作
 */
export abstract class LinkedList<T extends ILinkedListNode> {
  public readonly children: T[] = [];
  public head: T | null = null;
  public tail: T | null = null;

  /**
   * 在当前链式列表末尾插入一个子元素
   * @param node 子元素实例
   */
  public add(node: T) {
    if (this.tail === null) {
      this.head = node;
    } else {
      this.tail.nextSibling = node;
    }

    node.prevSibling = this.tail;
    this.tail = node;
    this.children.push(node);
    node.parent = this;
  }

  /**
   * 在目标子元素实例后插入一个子元素
   * @param node 要插入的子元素实例
   * @param target 目标子元素实例
   */
  public addAfter(node: T, target: T) {
    const index = this.findIndex(target);
    if (index > -1) {
      this.children.splice(index + 1, 0, node);
      if (target.nextSibling !== null) {
        target.nextSibling.prevSibling = node;
        node.nextSibling = target.nextSibling;
      } else {
        this.head = node;
      }
      node.prevSibling = target;
      target.nextSibling = node;
      node.parent = this;
    } else {
      throw new Error("target not exist in this list");
    }
  }

  /**
   * 在目标子元素实例前插入一个子元素
   * @param node 要插入的子元素实例
   * @param target 目标子元素实例
   */
  public addBefore(node: T, target: T) {
    const index = this.findIndex(target);
    if (index > -1) {
      this.children.splice(index, 0, node);
      if (target.prevSibling !== null) {
        target.prevSibling.nextSibling = node;
        node.prevSibling = target.prevSibling;
      } else {
        this.head = node;
      }
      node.nextSibling = target;
      target.prevSibling = node;
      node.parent = this;
    } else {
      throw new Error("target not exist in this list");
    }
  }

  /**
   * 在指定索引位置插入一个子元素实例
   * @param node 子元素实例
   * @param index 索引位置
   */
  public addAtIndex(node: T, index: number) {
    if (index > this.children.length) {
      throw new Error("invalid insert position");
    } else if (this.children.length === index) {
      this.add(node);
      return;
    } else {
      this.addBefore(node, this.children[index]);
    }
  }

  /**
   * 将一组子元素实例插入当前链式列表末尾
   * @param nodes 子元素数组
   */
  public addAll(nodes: T[]) {
    for (let index = 0, l = nodes.length; index < l; index++) {
      this.add(nodes[index]);
    }
  }

  /**
   * 清楚当前链式列表中所有子元素
   */
  public removeAll(): T[] {
    for (let i = this.children.length - 1; i >= 0; i--) {
      this.children[i].destroy();
      this.children[i].prevSibling = null;
      this.children[i].nextSibling = null;
      this.children[i].parent = null;
    }
    this.head = null;
    this.tail = null;
    const res = [...this.children];
    this.children.length = 0;
    return res;
  }

  /**
   * 从当前链式列表删除一个子元素
   * @param node 要删除的子元素
   */
  public remove(node: T) {
    const index = this.findIndex(node);
    if (index > -1) {
      this.children.splice(index, 1);
      if (node === this.tail) {
        this.tail = node.prevSibling;
      }
      if (node === this.head) {
        this.head = node.nextSibling;
      }
      if (node.nextSibling !== null) {
        node.nextSibling.prevSibling = node.prevSibling;
      }
      if (node.prevSibling !== null) {
        node.prevSibling.nextSibling = node.nextSibling;
      }

      node.nextSibling = null;
      node.prevSibling = null;
      node.parent = null;
    } else {
      throw new Error("can not remove node which is not in children list");
    }
  }

  /**
   * 查找元素在当前链式列表中的索引位置，如果找不到返回 -1
   * @param node 子元素实例
   */
  public findIndex(node: T) {
    for (let i = this.children.length - 1; i >= 0; i--) {
      if (this.children[i] === node) {
        return i;
      }
    }
    return -1;
  }
}

/**
 * 链式列表子元素接口
 */
export interface ILinkedListNode {
  /**
   * 前一个元素节点
   */
  prevSibling: this | null;
  /**
   * 后一个元素节点
   */
  nextSibling: this | null;
  /**
   * 当前子元素实例所属的链式列表
   */
  parent: LinkedList<ILinkedListNode> | null;

  /**
   * 销毁该节点，主要用来释放当前子元素节点所持有的各种资源，
   * 该方法并不会将子元素自身从所属链式列表中移除
   */
  destroy(): void;
}
