import type IRange from './IRange'
import type { ILinkedList, ILinkedListNode } from './LinkedList'
import { findChildInDocPos, getRelativeDocPos } from './util'

export interface ISelectedElementGettable {
  getSelectedElement(ranges: IRange[]): any[][]
}

export function ISelectedElementGettableDecorator<
  T extends new (...args: any[]) => ISelectedElementGettable &
    ILinkedList<ILinkedListNode & ISelectedElementGettable & { start: number }>,
>(constructor: T) {
  return class extends constructor {
    public override getSelectedElement(ranges: IRange[]): any[][] {
      const res: any[][] = []
      res.push([this])

      const stacks = ranges.map((range) => {
        const startChild = findChildInDocPos(range.start.index, this.children, true)
        const endChild = findChildInDocPos(range.end.index, this.children, true)
        if (startChild && endChild) {
          if (startChild === endChild) {
            return startChild.getSelectedElement([
              {
                start: getRelativeDocPos(startChild.start, range.start),
                end: getRelativeDocPos(startChild.start, range.end),
              },
            ])
          } else {
            const span: ILinkedListNode[] = []
            let currentFrag: ILinkedListNode | null = startChild
            while (currentFrag) {
              span.push(currentFrag)
              currentFrag = currentFrag.nextSibling
            }
            return [span]
          }
        } else {
          return []
        }
      })

      for (let i = 0; i < Math.min(...stacks.map((s) => s.length)); i++) {
        const tempRes = [stacks[0][i]]
        for (let j = 1; j < stacks.length; j++) {
          const stack = stacks[j]
          if (stack[i] !== stacks[0][i]) {
            tempRes.push(stack[i])
          }
        }
        res.push(tempRes)
      }

      return res
    }
  }
}
