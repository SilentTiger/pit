/**
 * 链式列表泛型类，提供了基本的链式列表操作
 */
export interface ILinkedList<T extends ILinkedListNode> {
  readonly children: T[]
  head: T | null
  tail: T | null
  beforeAdd?(nodes: T[], index: number, prevNode: T | null, nextNode: T | null, array: T[]): void
  afterAdd?(nodes: T[], index: number, prevNode: T | null, nextNode: T | null, array: T[]): void

  addLast(node: T): void
  addAfter(node: T, target: T): void
  addBefore(node: T, target: T): void
  addAtIndex(node: T, index: number): void
  addAll(nodes: T[]): void

  beforeRemove?(nodes: T[], index: number, prevNode: T | null, nextNode: T | null, array: T[]): void
  afterRemove?(nodes: T[], index: number, prevNode: T | null, nextNode: T | null, array: T[]): void

  remove(node: T): void
  removeAll(): T[]
  removeAllFrom(node: T): T[]

  beforeSplice?(start: number, deleteCount: number, nodes?: T[]): void
  splice(start: number, deleteCount: number, nodes?: T[]): T[]
  afterSplice?(start: number, deleteCount: number, nodes: T[], removedNodes: T[]): void

  findIndex(node: T): void
}

/**
 * 链式列表子元素接口
 */
export interface ILinkedListNode {
  /**
   * 前一个元素节点
   */
  prevSibling: this | null
  /**
   * 后一个元素节点
   */
  nextSibling: this | null
  /**
   * 当前子元素实例所属的链式列表
   */
  parent: ILinkedList<ILinkedListNode> | null

  /**
   * 销毁该节点，主要用来释放当前子元素节点所持有的各种资源，
   * 该方法并不会将子元素自身从所属链式列表中移除
   */
  destroy(): void
}

export function ILinkedListDecorator<T extends ILinkedListNode, U extends new (...args: any[]) => ILinkedList<T>>(
  constructor: U,
) {
  return class extends constructor {
    public readonly children: T[] = []
    public head: T | null = null
    public tail: T | null = null

    /**
     * 在当前链式列表末尾插入一个子元素
     * @param node 子元素实例
     */
    public addLast(node: T) {
      if (this.beforeAdd) {
        this.beforeAdd([node], this.children.length, this.tail, null, this.children)
      }
      if (this.tail === null) {
        this.head = node
      } else {
        this.tail.nextSibling = node
      }

      node.prevSibling = this.tail
      this.tail = node
      this.children.push(node)
      node.parent = this
      if (this.afterAdd) {
        this.afterAdd([node], this.children.length, this.tail, null, this.children)
      }
    }

    /**
     * 在目标子元素实例后插入一个子元素
     * @param node 要插入的子元素实例
     * @param target 目标子元素实例
     */
    public addAfter(node: T, target: T) {
      const index = this.findIndex(target)
      if (index > -1) {
        if (this.beforeAdd) {
          this.beforeAdd([node], index + 1, target, target.nextSibling, this.children)
        }
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
        if (this.afterAdd) {
          this.afterAdd([node], index + 1, target, target.nextSibling, this.children)
        }
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
        if (this.beforeAdd) {
          this.beforeAdd([node], index, target.prevSibling, target, this.children)
        }
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
        if (this.afterAdd) {
          this.afterAdd([node], index, node.prevSibling, target, this.children)
        }
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
      if (index > this.children.length || index < 0) {
        throw new Error('invalid insert position')
      } else {
        if (this.children.length === index) {
          if (this.beforeAdd) {
            this.beforeAdd([node], index, this.tail, null, this.children)
          }

          if (this.tail === null) {
            this.head = node
          } else {
            this.tail.nextSibling = node
          }
          node.prevSibling = this.tail
          this.tail = node
          this.children.push(node)
          node.parent = this
        } else {
          const target = this.children[index]
          if (this.beforeAdd) {
            this.beforeAdd([node], index, target.prevSibling, target, this.children)
          }
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
        }
        if (this.afterAdd) {
          this.afterAdd([node], index, node.prevSibling, node.nextSibling, this.children)
        }
      }
    }

    /**
     * 将一组子元素实例插入当前链式列表末尾
     * @param nodes 子元素数组
     */
    public addAll(nodes: T[]) {
      if (this.beforeAdd) {
        this.beforeAdd(nodes, this.children.length, this.tail, null, this.children)
      }
      for (let index = 0, l = nodes.length; index < l; index++) {
        const current = nodes[index]
        if (index > 0) {
          current.prevSibling = nodes[index - 1]
          nodes[index - 1].nextSibling = current
        }
        current.parent = this
      }
      if (this.children.length > 0) {
        const lastChild = this.children[this.children.length - 1]
        lastChild.nextSibling = nodes[0]
        nodes[0].prevSibling = lastChild
      } else {
        this.head = nodes[0]
      }
      this.tail = nodes[nodes.length - 1]
      // push 方法的参数数量是有限制的，不同浏览器不同，限制在 65535 个参数是比较稳妥的
      if (nodes.length <= 65535) {
        this.children.push(...nodes)
      } else {
        while (nodes.length > 0) {
          this.children.push(...nodes.splice(0, 65535))
        }
      }
      if (this.afterAdd) {
        this.afterAdd(nodes, this.children.length, nodes[0].prevSibling, null, this.children)
      }
    }

    /**
     * 清楚当前链式列表中所有子元素
     */
    public removeAll(): T[] {
      if (this.beforeRemove) {
        this.beforeRemove(this.children, 0, null, null, this.children)
      }
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

      if (this.afterRemove) {
        this.afterRemove(res, 0, null, null, res)
      }
      return res
    }

    /**
     * 从当前链式列表删除一个子元素
     * @param node 要删除的子元素
     */
    public remove(node: T) {
      const index = this.findIndex(node)
      if (index > -1) {
        const prevNode = node.prevSibling
        const nextNode = node.nextSibling
        if (this.beforeRemove) {
          this.beforeRemove([node], index, prevNode, nextNode, this.children)
        }
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
        if (this.afterRemove) {
          this.afterRemove([node], index, prevNode, nextNode, this.children)
        }
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
        const prevNode = node.prevSibling
        if (this.beforeRemove) {
          this.beforeRemove(this.children.slice(index), index, prevNode, null, this.children)
        }
        const res = this.children.splice(index)
        if (node === this.head) {
          this.head = null
          this.tail = null
        } else {
          this.tail = node.prevSibling
          ;(this.tail as T).nextSibling = null
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
        if (this.afterRemove) {
          this.afterRemove(res, index, prevNode, null, this.children)
        }
        return res
      } else {
        throw new Error('can not remove node which is not in children list')
      }
    }

    /**
     * splice children
     */
    public splice(start: number, deleteCount: number, nodes: T[] = []): T[] {
      if (this.beforeSplice) {
        this.beforeSplice(start, deleteCount, nodes)
      }
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

      if (this.afterSplice) {
        this.afterSplice(start, deleteCount, nodes ?? [], removedNodes)
      }
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
      return res
    }
  }
}
