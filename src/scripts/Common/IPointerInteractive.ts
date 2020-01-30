import { EnumCursorType } from './EnumCursorType'
import IRectangle from './IRectangle'

export interface IPointerInteractive extends IRectangle {
  getCursorType(): EnumCursorType
  onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void
  onPointerLeave(): void
  onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void
  onPointerDown(x: number, y: number): void
  onPointerUp(x: number, y: number): void
  onPointerTap(x: number, y: number): void
}

export function IPointerInteractiveDecorator<T extends { new(...args: any[]): IPointerInteractive }>(constructor: T) {
  return class extends constructor {
    currentHoverElement: IPointerInteractive | null = null

    onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number) {
      if (this.currentHoverElement) {
        // 按说在 enter 的时候，不可能有 currentHoverElement
        console.trace('strange')
      } else {
        const hoverBlock = targetStack[currentTargetIndex + 1] as IPointerInteractive
        if (hoverBlock) {
          hoverBlock.onPointerEnter(x - hoverBlock.x, y - hoverBlock.y, targetStack, currentTargetIndex + 1)
          this.currentHoverElement = hoverBlock
        }
      }
    }

    onPointerLeave() {
      if (this.currentHoverElement) {
        this.currentHoverElement.onPointerLeave()
        this.currentHoverElement = null
      }
    }

    onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void {
      if (this.currentHoverElement) {
        if (this.currentHoverElement === targetStack[currentTargetIndex + 1]) {
          this.currentHoverElement.onPointerMove(x - this.currentHoverElement.x, y - this.currentHoverElement.y, targetStack, currentTargetIndex + 1)
          return
        } else {
          this.currentHoverElement.onPointerLeave()
          this.currentHoverElement = null
        }
      }
      const hoverBlock = targetStack[currentTargetIndex + 1]
      if (hoverBlock) {
        hoverBlock.onPointerEnter(x - hoverBlock.x, y - hoverBlock.y, targetStack, currentTargetIndex + 1)
        this.currentHoverElement = hoverBlock as IPointerInteractive
      }
    }

    onPointerDown(x: number, y: number): void {
      if (this.currentHoverElement) {
        this.currentHoverElement.onPointerDown(x - this.currentHoverElement.x, y - this.currentHoverElement.y)
      }
    }

    onPointerUp(x: number, y: number): void {
      if (this.currentHoverElement) {
        this.currentHoverElement.onPointerUp(x - this.currentHoverElement.x, y - this.currentHoverElement.y)
      }
    }

    onPointerTap(x: number, y: number) {
      if (this.currentHoverElement) {
        this.currentHoverElement.onPointerTap(x - this.currentHoverElement.x, y - this.currentHoverElement.y)
      }
    }
  }
}
