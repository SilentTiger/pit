/**
 * 链式列表泛型类，提供了基本的链式列表操作
 */
export interface ILinkedList<T extends ILinkedListNode> {
  readonly children: T[]
  head: T | null
  tail: T | null
  add(node: T): void
  addAfter(node: T, target: T): void
  addBefore(node: T, target: T): void
  addAtIndex(node: T, index: number): void
  addAll(nodes: T[]): void
  removeAll(): T[]
  remove(node: T): void
  removeAllFrom(node: T): T[]
  splice(start: number, deleteCount: number, nodes?: T[]): T[]
  findIndex(node: T): void
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
  parent: ILinkedList<ILinkedListNode> | null;

  /**
   * 销毁该节点，主要用来释放当前子元素节点所持有的各种资源，
   * 该方法并不会将子元素自身从所属链式列表中移除
   */
  destroy(): void;
}

export function ILinkedListDecorator<T extends ILinkedListNode, U extends { new(...args: any[]): ILinkedList<T> }>(constructor: U) {
  return class extends constructor {
    public readonly children: T[] = [];
    public head: T | null = null;
    public tail: T | null = null;

    /**
     * 在当前链式列表末尾插入一个子元素
     * @param node 子元素实例
     */
    public add(node: T) {
      if (this.tail === null) {
        this.head = node
      } else {
        this.tail.nextSibling = node
      }

      node.prevSibling = this.tail
      this.tail = node
      this.children.push(node)
      node.parent = this
      super.add(node)
    }

    /**
     * 在目标子元素实例后插入一个子元素
     * @param node 要插入的子元素实例
     * @param target 目标子元素实例
     */
    public addAfter(node: T, target: T) {
      const index = this.findIndex(target)
      if (index > -1) {
        this.children.splice(index + 1, 0, node)
        if (target.nextSibling !== null) {
          target.nextSibling.prevSibling = node
          node.nextSibling = target.nextSibling
        } else {
          this.tail = node
        }
        node.prevSibling = target
        target.nextSibling = node
        node.parent = this
        super.addAfter(node, target)
      } else {
        throw new Error('target not exist in this list')
      }
    }

    /**
     * 在目标子元素实例前插入一个子元素
     * @param node 要插入的子元素实例
     * @param target 目标子元素实例
     */
    public addBefore(node: T, target: T) {
      const index = this.findIndex(target)
      if (index > -1) {
        this.children.splice(index, 0, node)
        if (target.prevSibling !== null) {
          target.prevSibling.nextSibling = node
          node.prevSibling = target.prevSibling
        } else {
          this.head = node
        }
        node.nextSibling = target
        target.prevSibling = node
        node.parent = this
        super.addBefore(node, target)
      } else {
        throw new Error('target not exist in this list')
      }
    }

    /**
     * 在指定索引位置插入一个子元素实例
     * @param node 子元素实例
     * @param index 索引位置
     */
    public addAtIndex(node: T, index: number) {
      if (index > this.children.length) {
        throw new Error('invalid insert position')
      } else if (this.children.length === index) {
        this.add(node)
      } else {
        this.addBefore(node, this.children[index])
      }
      this.addAtIndex(node, index)
    }

    /**
     * 将一组子元素实例插入当前链式列表末尾
     * @param nodes 子元素数组
     */
    public addAll(nodes: T[]) {
      for (let index = 0, l = nodes.length; index < l; index++) {
        this.add(nodes[index])
      }
      super.addAll(nodes)
    }

    /**
     * 清楚当前链式列表中所有子元素
     */
    public removeAll(): T[] {
      for (let i = this.children.length - 1; i >= 0; i--) {
        this.children[i].destroy()
        this.children[i].prevSibling = null
        this.children[i].nextSibling = null
        this.children[i].parent = null
      }
      this.head = null
      this.tail = null
      const res = [...this.children]
      this.children.length = 0
      super.removeAll()
      return res
    }

    /**
     * 从当前链式列表删除一个子元素
     * @param node 要删除的子元素
     */
    public remove(node: T) {
      const index = this.findIndex(node)
      if (index > -1) {
        this.children.splice(index, 1)
        if (node === this.tail) {
          this.tail = node.prevSibling
        }
        if (node === this.head) {
          this.head = node.nextSibling
        }
        if (node.nextSibling !== null) {
          node.nextSibling.prevSibling = node.prevSibling
        }
        if (node.prevSibling !== null) {
          node.prevSibling.nextSibling = node.nextSibling
        }

        node.nextSibling = null
        node.prevSibling = null
        node.parent = null

        super.remove(node)
      } else {
        throw new Error('can not remove node which is not in children list')
      }
    }

    /**
     * 删除指定子元素及其后的所有子元素
     * @returns 以数组形式返回所有被删除的子元素
     */
    public removeAllFrom(node: T): T[] {
      const index = this.findIndex(node)
      if (index > -1) {
        const res = this.children.splice(index)
        if (node === this.head) {
          this.head = null
          this.tail = null
        } else {
          this.tail = node.prevSibling;
          (this.tail as T).nextSibling = null
          node.prevSibling = null
        }
        if (res.length > 0) {
          for (let itemIndex = 0; itemIndex < res.length; itemIndex++) {
            const item = res[itemIndex]
            item.nextSibling = null
            item.prevSibling = null
            item.parent = null
          }
        }
        super.removeAllFrom(node)
        return res
      } else {
        throw new Error('can not remove node which is not in children list')
      }
    }

    /**
     * splice children
     */
    public splice(start: number, deleteCount: number, nodes: T[] = []): T[] {
      if (nodes.length > 0) {
        for (let index = 0; index < nodes.length - 1; index++) {
          const currentElement = nodes[index]
          const nextElement = nodes[index + 1]
          currentElement.nextSibling = nextElement
          nextElement.prevSibling = currentElement
          currentElement.parent = this
          nextElement.parent = this
        }
        nodes[nodes.length - 1].parent = this
        nodes[0].prevSibling = null
        nodes[nodes.length - 1].nextSibling = null
      }

      const actuallyInsertIndex = Math.min(start, this.children.length - 1)
      const removedNodes = this.children.splice(start, deleteCount, ...nodes)
      for (let index = 0; index < removedNodes.length; index++) {
        const element = removedNodes[index]
        element.nextSibling = null
        element.prevSibling = null
        element.parent = null
      }

      if (nodes.length > 0) {
        if (actuallyInsertIndex > 0) {
          this.children[actuallyInsertIndex - 1].nextSibling = nodes[0]
          nodes[0].prevSibling = this.children[actuallyInsertIndex - 1]
        }
        if (actuallyInsertIndex + nodes.length < this.children.length) {
          const actuallyInsertEndIndex = actuallyInsertIndex + nodes.length - 1
          this.children[actuallyInsertEndIndex].nextSibling = this.children[actuallyInsertEndIndex + 1]
          this.children[actuallyInsertEndIndex + 1].prevSibling = this.children[actuallyInsertEndIndex]
        }
      }

      if (this.children.length > 0) {
        this.head = this.children[0]
        this.tail = this.children[this.children.length - 1]
      } else {
        this.head = null
        this.tail = null
      }
      super.splice(start, deleteCount, nodes)
      return removedNodes
    }

    /**
     * 查找元素在当前链式列表中的索引位置，如果找不到返回 -1
     * @param node 子元素实例
     */
    public findIndex(node: T): number {
      let res = -1
      for (let i = this.children.length - 1; i >= 0; i--) {
        if (this.children[i] === node) {
          res = i
        }
      }
      super.findIndex(node)
      return res
    }
  }
}
