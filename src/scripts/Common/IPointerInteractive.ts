import { EnumCursorType } from './EnumCursorType'
import IRectangle from './IRectangle'

export default interface IPointerInteractive extends IRectangle {
  getCursorType(): EnumCursorType
  onPointerEnter(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void
  onPointerLeave(): void
  onPointerMove(x: number, y: number, targetStack: IPointerInteractive[], currentTargetIndex: number): void
  onPointerDown(x: number, y: number): void
  onPointerUp(x: number, y: number): void
  onPointerTap(x: number, y: number): void
}
