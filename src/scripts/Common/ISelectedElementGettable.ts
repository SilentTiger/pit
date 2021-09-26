import type IRange from './IRange'
import type { ILinkedList, ILinkedListNode } from './LinkedList'
import { findChildInDocPos, getRelativeDocPos, getSelectedElement } from './util'

export interface ISelectedElementGettable {
  getSelectedElement(range: IRange): any[][]
}

export function ISelectedElementGettableDecorator<
  T extends new (...args: any[]) => ISelectedElementGettable &
    ILinkedList<ILinkedListNode & ISelectedElementGettable & { start: number }>,
>(constructor: T) {
  return class extends constructor {
    public override getSelectedElement(range: IRange): any[][] {
      return getSelectedElement(range, this, this.children)
    }
  }
}
